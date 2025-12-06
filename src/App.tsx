import { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  PerspectiveCamera,
  shaderMaterial,
  Float,
  Stars,
  Sparkles,
  useTexture,
  Line as DreiLine
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { MathUtils } from 'three';
import * as random from 'maath/random';
import { GestureRecognizer, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import './App.css';
import { getCDNUrl, MEDIAPIPE_WASM_PATH } from './config';

// --- 动态生成照片列表 (使用 CDN 配置) ---
const TOTAL_NUMBERED_PHOTOS = 27;
const bodyPhotoPaths = [
  getCDNUrl('/photos/top.png'),
  ...Array.from({ length: TOTAL_NUMBERED_PHOTOS }, (_, i) => {
    const num = i + 1;
    if (num === 25) return getCDNUrl('/photos/25.PNG');
    if (num >= 26) return getCDNUrl(`/photos/${num}.png`);
    return getCDNUrl(`/photos/${num}.jpg`);
  })
];

// --- 视觉配置 ---
const CONFIG = {
  colors: {
    emerald: '#004225', // 纯正祖母绿
    gold: '#FFD700',
    silver: '#ECEFF1',
    red: '#D32F2F',
    green: '#2E7D32',
    white: '#FFFFFF',   // 纯白色
    warmLight: '#FFD54F',
    lights: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'], // 彩灯
    // 拍立得边框颜色池 (复古柔和色系)
    borders: ['#FFFAF0', '#F0E68C', '#E6E6FA', '#FFB6C1', '#98FB98', '#87CEFA', '#FFDAB9'],
    // 圣诞元素颜色
    giftColors: ['#D32F2F', '#FFD700', '#1976D2', '#2E7D32'],
    candyColors: ['#FF0000', '#FFFFFF']
  },
  counts: {
    foliage: 80420,
    ornaments: 270,   // 拍立得照片数量
    elements: 270,    // 圣诞元素数量
    lights: 420       // 彩灯数量
  },
  tree: { height: 27, radius: 8.42  }, // 树体尺寸
  photos: {
    // top 属性不再需要，因为已经移入 body
    body: bodyPhotoPaths
  }
};

// --- Shader Material (Foliage) ---
const FoliageMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color(CONFIG.colors.emerald), uProgress: 0 },
  `uniform float uTime; uniform float uProgress; attribute vec3 aTargetPos; attribute float aRandom;
  varying vec2 vUv; varying float vMix;
  float cubicInOut(float t) { return t < 0.5 ? 4.0 * t * t * t : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0; }
  void main() {
    vUv = uv;
    vec3 noise = vec3(sin(uTime * 1.5 + position.x), cos(uTime + position.y), sin(uTime * 1.5 + position.z)) * 0.15;
    float t = cubicInOut(uProgress);
    vec3 finalPos = mix(position, aTargetPos + noise, t);
    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_PointSize = (60.0 * (1.0 + aRandom)) / -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
    vMix = t;
  }`,
  `uniform vec3 uColor; varying float vMix;
  void main() {
    float r = distance(gl_PointCoord, vec2(0.5)); if (r > 0.5) discard;
    vec3 finalColor = mix(uColor * 0.3, uColor * 1.2, vMix);
    gl_FragColor = vec4(finalColor, 1.0);
  }`
);
extend({ FoliageMaterial });

// --- Helper: Tree Shape ---
const getTreePosition = () => {
  const h = CONFIG.tree.height; const rBase = CONFIG.tree.radius;
  const y = (Math.random() * h) - (h / 2); const normalizedY = (y + (h/2)) / h;
  const currentRadius = rBase * (1 - normalizedY); const theta = Math.random() * Math.PI * 2;
  const r = Math.random() * currentRadius;
  return [r * Math.cos(theta), y, r * Math.sin(theta)];
};

// --- Component: Foliage ---
const Foliage = ({ state }: { state: 'CHAOS' | 'FORMED' }) => {
  const materialRef = useRef<any>(null);
  const { positions, targetPositions, randoms } = useMemo(() => {
    const count = CONFIG.counts.foliage;
    const positions = new Float32Array(count * 3); const targetPositions = new Float32Array(count * 3); const randoms = new Float32Array(count);
    const spherePoints = random.inSphere(new Float32Array(count * 3), { radius: 25 }) as Float32Array;
    for (let i = 0; i < count; i++) {
      positions[i*3] = spherePoints[i*3]; positions[i*3+1] = spherePoints[i*3+1]; positions[i*3+2] = spherePoints[i*3+2];
      const [tx, ty, tz] = getTreePosition();
      targetPositions[i*3] = tx; targetPositions[i*3+1] = ty; targetPositions[i*3+2] = tz;
      randoms[i] = Math.random();
    }
    return { positions, targetPositions, randoms };
  }, []);
  useFrame((rootState, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime = rootState.clock.elapsedTime;
      const targetProgress = state === 'FORMED' ? 1 : 0;
      materialRef.current.uProgress = MathUtils.damp(materialRef.current.uProgress, targetProgress, 1.5, delta);
    }
  });
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aTargetPos" args={[targetPositions, 3]} />
        <bufferAttribute attach="attributes-aRandom" args={[randoms, 1]} />
      </bufferGeometry>
      {/* @ts-ignore */}
      <foliageMaterial ref={materialRef} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

// --- Component: Photo Ornaments (Double-Sided Polaroid) ---
const PhotoOrnaments = ({ state }: { state: 'CHAOS' | 'FORMED' }) => {
  const textures = useTexture(CONFIG.photos.body);
  const count = CONFIG.counts.ornaments;
  const groupRef = useRef<THREE.Group>(null);

  const borderGeometry = useMemo(() => new THREE.PlaneGeometry(1.2, 1.5), []);
  const photoGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  const data = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => {
      const chaosPos = new THREE.Vector3((Math.random()-0.5)*70, (Math.random()-0.5)*70, (Math.random()-0.5)*70);
      const h = CONFIG.tree.height; const y = (Math.random() * h) - (h / 2);
      const rBase = CONFIG.tree.radius;
      const currentRadius = (rBase * (1 - (y + (h/2)) / h)) + 0.5;
      const theta = Math.random() * Math.PI * 2;
      const targetPos = new THREE.Vector3(currentRadius * Math.cos(theta), y, currentRadius * Math.sin(theta));

      const isBig = Math.random() < 0.2;
      const baseScale = isBig ? 2.2 : 0.8 + Math.random() * 0.6;
      const weight = 0.8 + Math.random() * 1.2;
      const borderColor = CONFIG.colors.borders[Math.floor(Math.random() * CONFIG.colors.borders.length)];

      const rotationSpeed = {
        x: (Math.random() - 0.5) * 1.0,
        y: (Math.random() - 0.5) * 1.0,
        z: (Math.random() - 0.5) * 1.0
      };
      const chaosRotation = new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);

      return {
        chaosPos, targetPos, scale: baseScale, weight,
        textureIndex: i % textures.length,
        borderColor,
        currentPos: chaosPos.clone(),
        chaosRotation,
        rotationSpeed,
        wobbleOffset: Math.random() * 10,
        wobbleSpeed: 0.5 + Math.random() * 0.5
      };
    });
  }, [textures, count]);

  useFrame((stateObj, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    const time = stateObj.clock.elapsedTime;

    groupRef.current.children.forEach((group, i) => {
      const objData = data[i];
      const target = isFormed ? objData.targetPos : objData.chaosPos;

      objData.currentPos.lerp(target, delta * (isFormed ? 0.8 * objData.weight : 0.5));
      group.position.copy(objData.currentPos);

      if (isFormed) {
         const targetLookPos = new THREE.Vector3(group.position.x * 2, group.position.y + 0.5, group.position.z * 2);
         group.lookAt(targetLookPos);

         const wobbleX = Math.sin(time * objData.wobbleSpeed + objData.wobbleOffset) * 0.05;
         const wobbleZ = Math.cos(time * objData.wobbleSpeed * 0.8 + objData.wobbleOffset) * 0.05;
         group.rotation.x += wobbleX;
         group.rotation.z += wobbleZ;

      } else {
         group.rotation.x += delta * objData.rotationSpeed.x;
         group.rotation.y += delta * objData.rotationSpeed.y;
         group.rotation.z += delta * objData.rotationSpeed.z;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => (
        <group key={i} scale={[obj.scale, obj.scale, obj.scale]} rotation={state === 'CHAOS' ? obj.chaosRotation : [0,0,0]}>
          {/* 正面 */}
          <group position={[0, 0, 0.015]}>
            <mesh geometry={photoGeometry}>
              <meshStandardMaterial
                map={textures[obj.textureIndex]}
                roughness={0.5} metalness={0}
                emissive={CONFIG.colors.white} emissiveMap={textures[obj.textureIndex]} emissiveIntensity={1.0}
                side={THREE.FrontSide}
              />
            </mesh>
            <mesh geometry={borderGeometry} position={[0, -0.15, -0.01]}>
              <meshStandardMaterial color={obj.borderColor} roughness={0.9} metalness={0} side={THREE.FrontSide} />
            </mesh>
          </group>
          {/* 背面 */}
          <group position={[0, 0, -0.015]} rotation={[0, Math.PI, 0]}>
            <mesh geometry={photoGeometry}>
              <meshStandardMaterial
                map={textures[obj.textureIndex]}
                roughness={0.5} metalness={0}
                emissive={CONFIG.colors.white} emissiveMap={textures[obj.textureIndex]} emissiveIntensity={1.0}
                side={THREE.FrontSide}
              />
            </mesh>
            <mesh geometry={borderGeometry} position={[0, -0.15, -0.01]}>
              <meshStandardMaterial color={obj.borderColor} roughness={0.9} metalness={0} side={THREE.FrontSide} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
};

// --- Component: Christmas Elements ---
const ChristmasElements = ({ state }: { state: 'CHAOS' | 'FORMED' }) => {
  const count = CONFIG.counts.elements;
  const groupRef = useRef<THREE.Group>(null);

  const boxGeometry = useMemo(() => new THREE.BoxGeometry(0.8, 0.8, 0.8), []);
  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(0.5, 16, 16), []);
  const caneGeometry = useMemo(() => new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8), []);

  const data = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const chaosPos = new THREE.Vector3((Math.random()-0.5)*60, (Math.random()-0.5)*60, (Math.random()-0.5)*60);
      const h = CONFIG.tree.height;
      const y = (Math.random() * h) - (h / 2);
      const rBase = CONFIG.tree.radius;
      const currentRadius = (rBase * (1 - (y + (h/2)) / h)) * 0.95;
      const theta = Math.random() * Math.PI * 2;

      const targetPos = new THREE.Vector3(currentRadius * Math.cos(theta), y, currentRadius * Math.sin(theta));

      const type = Math.floor(Math.random() * 3);
      let color; let scale = 1;
      if (type === 0) { color = CONFIG.colors.giftColors[Math.floor(Math.random() * CONFIG.colors.giftColors.length)]; scale = 0.8 + Math.random() * 0.4; }
      else if (type === 1) { color = CONFIG.colors.giftColors[Math.floor(Math.random() * CONFIG.colors.giftColors.length)]; scale = 0.6 + Math.random() * 0.4; }
      else { color = Math.random() > 0.5 ? CONFIG.colors.red : CONFIG.colors.white; scale = 0.7 + Math.random() * 0.3; }

      const rotationSpeed = { x: (Math.random()-0.5)*2.0, y: (Math.random()-0.5)*2.0, z: (Math.random()-0.5)*2.0 };
      return { type, chaosPos, targetPos, color, scale, currentPos: chaosPos.clone(), chaosRotation: new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI), rotationSpeed };
    });
  }, [boxGeometry, sphereGeometry, caneGeometry]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const objData = data[i];
      const target = isFormed ? objData.targetPos : objData.chaosPos;
      objData.currentPos.lerp(target, delta * 1.5);
      mesh.position.copy(objData.currentPos);
      mesh.rotation.x += delta * objData.rotationSpeed.x; mesh.rotation.y += delta * objData.rotationSpeed.y; mesh.rotation.z += delta * objData.rotationSpeed.z;
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => {
        let geometry; if (obj.type === 0) geometry = boxGeometry; else if (obj.type === 1) geometry = sphereGeometry; else geometry = caneGeometry;
        return ( <mesh key={i} scale={[obj.scale, obj.scale, obj.scale]} geometry={geometry} rotation={obj.chaosRotation}>
          <meshStandardMaterial color={obj.color} roughness={0.3} metalness={0.4} emissive={obj.color} emissiveIntensity={0.2} />
        </mesh> )})}
    </group>
  );
};

// --- Component: Fairy Lights ---
const FairyLights = ({ state }: { state: 'CHAOS' | 'FORMED' }) => {
  const count = CONFIG.counts.lights;
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useMemo(() => new THREE.SphereGeometry(0.8, 8, 8), []);

  const data = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const chaosPos = new THREE.Vector3((Math.random()-0.5)*60, (Math.random()-0.5)*60, (Math.random()-0.5)*60);
      const h = CONFIG.tree.height; const y = (Math.random() * h) - (h / 2); const rBase = CONFIG.tree.radius;
      const currentRadius = (rBase * (1 - (y + (h/2)) / h)) + 0.3; const theta = Math.random() * Math.PI * 2;
      const targetPos = new THREE.Vector3(currentRadius * Math.cos(theta), y, currentRadius * Math.sin(theta));
      const color = CONFIG.colors.lights[Math.floor(Math.random() * CONFIG.colors.lights.length)];
      const speed = 2 + Math.random() * 3;
      return { chaosPos, targetPos, color, speed, currentPos: chaosPos.clone(), timeOffset: Math.random() * 100 };
    });
  }, []);

  useFrame((stateObj, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    const time = stateObj.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const objData = data[i];
      const target = isFormed ? objData.targetPos : objData.chaosPos;
      objData.currentPos.lerp(target, delta * 2.0);
      const mesh = child as THREE.Mesh;
      mesh.position.copy(objData.currentPos);
      const intensity = (Math.sin(time * objData.speed + objData.timeOffset) + 1) / 2;
      if (mesh.material) { (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = isFormed ? 3 + intensity * 4 : 0; }
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => ( <mesh key={i} scale={[0.15, 0.15, 0.15]} geometry={geometry}>
          <meshStandardMaterial color={obj.color} emissive={obj.color} emissiveIntensity={0} toneMapped={false} />
        </mesh> ))}
    </group>
  );
};

// --- Component: Magic Light Trail (荧光灯丝环绕动画) ---
const MagicLightTrail = ({ state }: { state: 'CHAOS' | 'FORMED' }) => {
  const [progress, setProgress] = useState(0);
  const prevStateRef = useRef(state);

  const allPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const h = CONFIG.tree.height;
    const rBase = CONFIG.tree.radius;
    const segments = 200;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = (t * h) - (h / 2);
      const currentRadius = rBase * (1 - t) + 0.5;
      const angle = t * Math.PI * 8; // 8圈螺旋
      pts.push(new THREE.Vector3(
        currentRadius * Math.cos(angle),
        y,
        currentRadius * Math.sin(angle)
      ));
    }
    return pts;
  }, []);

  useEffect(() => {
    // 从 CHAOS 到 FORMED：重置进度开始生成
    if (prevStateRef.current === 'CHAOS' && state === 'FORMED') {
      setProgress(0);
    }
    prevStateRef.current = state;
  }, [state]);

  useFrame((_, delta) => {
    if (state === 'FORMED' && progress < 1) {
      // 生成动画：从 0 到 1，生成完成后保持在 1
      setProgress(Math.min(progress + delta * 0.8, 1));
    } else if (state === 'CHAOS' && progress > 0) {
      // 消失动画：从当前进度到 0
      setProgress(Math.max(progress - delta * 2, 0));
    }
  });

  if (progress === 0) return null;

  const visiblePoints = allPoints.slice(0, Math.floor(allPoints.length * progress));

  return (
    <DreiLine
      points={visiblePoints}
      color="#00FFFF"
      lineWidth={2}
      transparent
      opacity={0.8}
    />
  );
};

// --- Component: Top Message (树顶祝福文字) ---
const TopMessage = ({ userName, state }: { userName: string; state: 'CHAOS' | 'FORMED' }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (state === 'FORMED' && userName) {
      const timer = setTimeout(() => setShow(true), 2000); // 生成完成2秒后显示
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [state, userName]);

  if (!show || !userName) return null;

  return (
    <group position={[0, CONFIG.tree.height / 2 + 4, 0]}>
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
        {/* 这里使用 HTML 覆盖层来显示文字，因为 3D 文字需要额外的字体加载 */}
      </Float>
    </group>
  );
};

// --- Component: Top Star (No Photo, Pure Gold 3D Star) ---
const TopStar = ({ state }: { state: 'CHAOS' | 'FORMED' }) => {
  const groupRef = useRef<THREE.Group>(null);

  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 1.3; const innerRadius = 0.7; const points = 5;
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      i === 0 ? shape.moveTo(radius*Math.cos(angle), radius*Math.sin(angle)) : shape.lineTo(radius*Math.cos(angle), radius*Math.sin(angle));
    }
    shape.closePath();
    return shape;
  }, []);

  const starGeometry = useMemo(() => {
    return new THREE.ExtrudeGeometry(starShape, {
      depth: 0.4, // 增加一点厚度
      bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 3,
    });
  }, [starShape]);

  // 纯金材质
  const goldMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: CONFIG.colors.gold,
    emissive: CONFIG.colors.gold,
    emissiveIntensity: 1.5, // 适中亮度，既发光又有质感
    roughness: 0.1,
    metalness: 1.0,
  }), []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
      const targetScale = state === 'FORMED' ? 1 : 0;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 3);
    }
  });

  return (
    <group ref={groupRef} position={[0, CONFIG.tree.height / 2 + 1.8, 0]}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
        <mesh geometry={starGeometry} material={goldMaterial} />
      </Float>
    </group>
  );
};

// --- Main Scene Experience ---
const Experience = ({ sceneState, rotationSpeed, userName }: { sceneState: 'CHAOS' | 'FORMED', rotationSpeed: number, userName: string }) => {
  const controlsRef = useRef<any>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const prevStateRef = useRef(sceneState);
  const [isResetting, setIsResetting] = useState(false);

  // 监听状态变化，自动校准相机
  useEffect(() => {
    if (prevStateRef.current === 'CHAOS' && sceneState === 'FORMED' && controlsRef.current && cameraRef.current) {
      setIsResetting(true);
      
      // 目标位置：正面观看圣诞树
      const targetPosition = new THREE.Vector3(0, 8, 60);
      const targetLookAt = new THREE.Vector3(0, 0, 0);
      
      // 平滑过渡到目标位置
      const startPosition = cameraRef.current.position.clone();
      const startTarget = controlsRef.current.target.clone();
      let progress = 0;
      
      const resetInterval = setInterval(() => {
        progress += 0.02; // 控制过渡速度
        
        if (progress >= 1) {
          progress = 1;
          clearInterval(resetInterval);
          setIsResetting(false);
        }
        
        // 使用缓动函数
        const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        
        if (cameraRef.current && controlsRef.current) {
          // 插值相机位置
          cameraRef.current.position.lerpVectors(startPosition, targetPosition, easeProgress);
          
          // 插值目标点
          const newTarget = new THREE.Vector3().lerpVectors(startTarget, targetLookAt, easeProgress);
          controlsRef.current.target.copy(newTarget);
          
          controlsRef.current.update();
        }
      }, 16); // 约60fps
      
      return () => clearInterval(resetInterval);
    }
    prevStateRef.current = sceneState;
  }, [sceneState]);

  useFrame(() => {
    if (controlsRef.current && !isResetting) {
      controlsRef.current.setAzimuthalAngle(controlsRef.current.getAzimuthalAngle() + rotationSpeed);
      controlsRef.current.update();
    }
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 8, 60]} fov={45} />
      <OrbitControls 
        ref={controlsRef} 
        enablePan={true} 
        enableZoom={true} 
        minDistance={20} 
        maxDistance={120} 
        autoRotate={rotationSpeed === 0 && sceneState === 'FORMED'} 
        autoRotateSpeed={0.3} 
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
        enabled={!isResetting}
      />

      <color attach="background" args={['#000300']} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Environment files={getCDNUrl('/dikhololo_night_1k.hdr')} background={false} />

      <ambientLight intensity={0.4} color="#003311" />
      <pointLight position={[30, 30, 30]} intensity={100} color={CONFIG.colors.warmLight} />
      <pointLight position={[-30, 10, -30]} intensity={50} color={CONFIG.colors.gold} />
      <pointLight position={[0, -20, 10]} intensity={30} color="#ffffff" />

      <group position={[0, -6, 0]}>
        <Foliage state={sceneState} />
        <MagicLightTrail state={sceneState} />
        <Suspense fallback={null}>
           <PhotoOrnaments state={sceneState} />
           <ChristmasElements state={sceneState} />
           <FairyLights state={sceneState} />
           <TopStar state={sceneState} />
           <TopMessage userName={userName} state={sceneState} />
        </Suspense>
        <Sparkles count={600} scale={50} size={8} speed={0.4} opacity={0.4} color={CONFIG.colors.silver} />
      </group>

      <EffectComposer>
        <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.1} intensity={1.5} radius={0.5} mipmapBlur />
        <Vignette eskil={false} offset={0.1} darkness={1.2} />
      </EffectComposer>
    </>
  );
};

// --- Gesture Controller ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GestureController = ({ onGesture, onMove, onStatus, debugMode }: any) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let gestureRecognizer: GestureRecognizer;
    let requestRef: number;

    const setup = async () => {
      onStatus("DOWNLOADING AI...");
      try {
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
        gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        onStatus("REQUESTING CAMERA...");
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            onStatus("AI READY: SHOW HAND");
            predictWebcam();
          }
        } else {
            onStatus("ERROR: CAMERA PERMISSION DENIED");
        }
      } catch (err: any) {
        onStatus(`ERROR: ${err.message || 'MODEL FAILED'}`);
      }
    };

    const predictWebcam = () => {
      if (gestureRecognizer && videoRef.current && canvasRef.current) {
        if (videoRef.current.videoWidth > 0) {
            const results = gestureRecognizer.recognizeForVideo(videoRef.current, Date.now());
            const ctx = canvasRef.current.getContext("2d");
            if (ctx && debugMode) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                canvasRef.current.width = videoRef.current.videoWidth; canvasRef.current.height = videoRef.current.videoHeight;
                if (results.landmarks) for (const landmarks of results.landmarks) {
                        const drawingUtils = new DrawingUtils(ctx);
                        drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, { color: "#FFD700", lineWidth: 2 });
                        drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 1 });
                }
            } else if (ctx && !debugMode) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            if (results.gestures.length > 0) {
              const name = results.gestures[0][0].categoryName; const score = results.gestures[0][0].score;
              if (score > 0.4) {
                 if (name === "Open_Palm") onGesture("CHAOS"); if (name === "Closed_Fist") onGesture("FORMED");
                 if (debugMode) onStatus(`DETECTED: ${name}`);
              }
              if (results.landmarks.length > 0) {
                const speed = (0.5 - results.landmarks[0][0].x) * 0.15;
                onMove(Math.abs(speed) > 0.01 ? speed : 0);
              }
            } else { onMove(0); if (debugMode) onStatus("AI READY: NO HAND"); }
        }
        requestRef = requestAnimationFrame(predictWebcam);
      }
    };
    setup();
    return () => cancelAnimationFrame(requestRef);
  }, [onGesture, onMove, onStatus, debugMode]);

  return (
    <>
      <video ref={videoRef} style={{ opacity: debugMode ? 0.6 : 0, position: 'fixed', top: 0, right: 0, width: debugMode ? '320px' : '1px', zIndex: debugMode ? 100 : -1, pointerEvents: 'none', transform: 'scaleX(-1)' }} playsInline muted autoPlay />
      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, right: 0, width: debugMode ? '320px' : '1px', height: debugMode ? 'auto' : '1px', zIndex: debugMode ? 101 : -1, pointerEvents: 'none', transform: 'scaleX(-1)' }} />
    </>
  );
};

// --- App Entry ---
export default function GrandTreeApp() {
  const [sceneState, setSceneState] = useState<'CHAOS' | 'FORMED'>('CHAOS');
  const [rotationSpeed, setRotationSpeed] = useState(0);
  const [aiStatus, setAiStatus] = useState("INITIALIZING...");
  const [debugMode, setDebugMode] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [userName, setUserName] = useState('');
  const [inputName, setInputName] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [displayedText, setDisplayedText] = useState('');
  const [showGreeting, setShowGreeting] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('初始化...');

  // 预加载资源 - 优化版本，更真实的进度显示
  useEffect(() => {
    let actualLoadedCount = 0;
    let displayProgress = 0;
    const totalResources = CONFIG.photos.body.length + 1; // 照片 + HDR环境贴图
    
    // 平滑进度条动画
    const smoothProgressInterval = setInterval(() => {
      const targetProgress = Math.floor((actualLoadedCount / totalResources) * 100);
      
      if (displayProgress < targetProgress) {
        displayProgress = Math.min(displayProgress + 1, targetProgress);
        setLoadingProgress(displayProgress);
        
        // 更新加载状态文字
        if (displayProgress < 30) {
          setLoadingStatus('加载资源中...');
        } else if (displayProgress < 70) {
          setLoadingStatus('准备照片...');
        } else if (displayProgress < 95) {
          setLoadingStatus('加载环境贴图...');
        } else {
          setLoadingStatus('即将完成...');
        }
      }
      
      if (displayProgress >= 100) {
        clearInterval(smoothProgressInterval);
        setTimeout(() => {
          setIsLoading(false);
        }, 300); // 显示100%后稍微延迟
      }
    }, 30); // 每30ms更新一次，让进度条更平滑
    
    // 预加载照片
    const imagePromises = CONFIG.photos.body.map((path, index) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          actualLoadedCount++;
          resolve(true);
        };
        img.onerror = () => {
          actualLoadedCount++;
          resolve(false);
        };
        // 添加随机延迟，模拟真实网络加载
        setTimeout(() => {
          img.src = path;
        }, index * 50); // 每张图片间隔50ms开始加载
      });
    });

    // 预加载 HDR 环境贴图
    const hdrPromise = new Promise((resolve) => {
      setTimeout(() => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', getCDNUrl('/dikhololo_night_1k.hdr'), true);
        xhr.onprogress = (event) => {
          if (event.lengthComputable) {
            // HDR 文件加载进度也反映到总进度中
            const hdrProgress = event.loaded / event.total;
            actualLoadedCount = CONFIG.photos.body.length + hdrProgress;
          }
        };
        xhr.onload = () => {
          actualLoadedCount = totalResources;
          resolve(true);
        };
        xhr.onerror = () => {
          actualLoadedCount = totalResources;
          resolve(false);
        };
        xhr.send();
      }, 200); // HDR 稍后开始加载
    });

    Promise.all([...imagePromises, hdrPromise]).then(() => {
      actualLoadedCount = totalResources;
    });

    return () => clearInterval(smoothProgressInterval);
  }, []);

  // 打字机效果
  useEffect(() => {
    if (sceneState === 'FORMED' && userName && !showWelcome) {
      // 延迟2秒后开始打字
      const startDelay = setTimeout(() => {
        setShowGreeting(true);
        const fullText = `To:${userName}\n天天开心`;
        let currentIndex = 0;
        
        const typingInterval = setInterval(() => {
          if (currentIndex <= fullText.length) {
            setDisplayedText(fullText.slice(0, currentIndex));
            currentIndex++;
          } else {
            clearInterval(typingInterval);
          }
        }, 150); // 每个字150毫秒

        return () => clearInterval(typingInterval);
      }, 2000);

      return () => clearTimeout(startDelay);
    } else {
      setShowGreeting(false);
      setDisplayedText('');
    }
  }, [sceneState, userName, showWelcome]);

  const handleStart = () => {
    if (inputName.trim() && !isLoading) {
      setUserName(inputName.trim());
      setShowWelcome(false);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000', position: 'relative', overflow: 'hidden' }}>
      {/* Welcome Modal */}
      {showWelcome && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `url(${getCDNUrl('/photos/phone_bg.png')})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.7)',
            border: '2px solid #FFD700',
            borderRadius: '20px',
            padding: '40px 30px',
            maxWidth: '90%',
            width: '500px',
            margin: '0 auto',
            textAlign: 'center',
            boxShadow: '0 0 50px rgba(255, 215, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.5s ease-in'
          }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎄</div>
            <h1 style={{
              color: '#FFD700',
              fontFamily: 'serif',
              fontSize: '32px',
              marginBottom: '20px',
              letterSpacing: '2px',
              textShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
            }}>
              Merry Christmas
            </h1>
            <p style={{
              color: '#ECEFF1',
              fontFamily: 'sans-serif',
              fontSize: '16px',
              lineHeight: '1.6',
              marginBottom: '30px',
              opacity: 0.9
            }}>
              愿这个圣诞节带给你温暖与欢乐<br />
              愿新的一年充满希望与美好<br />
              让我们一起点亮这棵属于你的圣诞树 ✨
            </p>
            <input
              type="text"
              placeholder="请输入你的名字..."
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleStart()}
              disabled={false}
              style={{
                width: '100%',
                padding: '15px 20px',
                fontSize: '16px',
                fontFamily: 'sans-serif',
                border: '2px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: '#FFD700',
                outline: 'none',
                marginBottom: '15px',
                textAlign: 'center',
                transition: 'all 0.3s',
                boxSizing: 'border-box'
              }}
              autoFocus
            />
            
            {/* 加载进度条 - 始终显示 */}
            <div style={{ marginBottom: '20px', minHeight: '50px' }}>
              {isLoading ? (
                <>
                  <div style={{
                    width: '100%',
                    height: '10px',
                    backgroundColor: 'rgba(255, 215, 0, 0.2)',
                    borderRadius: '5px',
                    overflow: 'hidden',
                    marginBottom: '12px',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                  }}>
                    <div style={{
                      width: `${loadingProgress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s infinite',
                      transition: 'width 0.1s linear',
                      boxShadow: '0 0 15px rgba(255, 215, 0, 0.8)',
                      borderRadius: '5px'
                    }} />
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <p style={{
                      color: 'rgba(255, 215, 0, 0.9)',
                      fontSize: '13px',
                      margin: 0,
                      fontFamily: 'sans-serif'
                    }}>
                      {loadingStatus}
                    </p>
                    <p style={{
                      color: '#FFD700',
                      fontSize: '14px',
                      margin: 0,
                      fontFamily: 'sans-serif',
                      fontWeight: 'bold'
                    }}>
                      {loadingProgress}%
                    </p>
                  </div>
                </>
              ) : (
                <p style={{
                  color: 'rgba(76, 175, 80, 0.9)',
                  fontSize: '13px',
                  margin: 0,
                  fontFamily: 'sans-serif',
                  textAlign: 'center'
                }}>
                  ✓ 资源加载完成
                </p>
              )}
            </div>

            <button
              onClick={handleStart}
              disabled={!inputName.trim() || isLoading}
              style={{
                padding: '15px 40px',
                fontSize: '18px',
                fontFamily: 'serif',
                fontWeight: 'bold',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                backgroundColor: (inputName.trim() && !isLoading) ? '#FFD700' : 'rgba(255, 215, 0, 0.3)',
                color: (inputName.trim() && !isLoading) ? '#000' : '#666',
                border: 'none',
                borderRadius: '10px',
                cursor: (inputName.trim() && !isLoading) ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s',
                boxShadow: (inputName.trim() && !isLoading) ? '0 0 20px rgba(255, 215, 0, 0.5)' : 'none'
              }}
            >
              {isLoading ? '加载中...' : '开始体验'}
            </button>
          </div>
        </div>
      )}

      <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
        <Canvas dpr={[1, 2]} gl={{ toneMapping: THREE.ReinhardToneMapping }} shadows>
            <Experience sceneState={sceneState} rotationSpeed={rotationSpeed} userName={userName} />
        </Canvas>
      </div>
      {!showWelcome && <GestureController onGesture={setSceneState} onMove={setRotationSpeed} onStatus={setAiStatus} debugMode={debugMode} />}

      {/* Top Message Overlay */}
      {showGreeting && displayedText && (
        <div style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          pointerEvents: 'none'
        }}>
          <div 
            className="handwriting-text"
            style={{
              fontSize: '27px',
              fontWeight: 'normal',
              color: '#FFD700',
              textAlign: 'center',
              textShadow: '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.5)',
              letterSpacing: '2px',
              lineHeight: '1.8',
              whiteSpace: 'pre-wrap'
            }}>
            {displayedText}
          </div>
        </div>
      )}

      {/* UI - Stats */}
      {!showWelcome && (
        <div style={{ position: 'absolute', bottom: '30px', left: '40px', color: '#888', zIndex: 10, fontFamily: 'sans-serif', userSelect: 'none' }}>
          {userName && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: '#FFD700', fontWeight: 'bold', margin: 0 }}>
                🎅 {userName} 的圣诞树
              </p>
            </div>
          )}
          <div style={{ marginBottom: '15px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>Memories</p>
            <p style={{ fontSize: '24px', color: '#FFD700', fontWeight: 'bold', margin: 0 }}>
              {CONFIG.counts.ornaments.toLocaleString()} <span style={{ fontSize: '10px', color: '#555', fontWeight: 'normal' }}>POLAROIDS</span>
            </p>
          </div>
          <div>
            <p style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>Foliage</p>
            <p style={{ fontSize: '24px', color: '#004225', fontWeight: 'bold', margin: 0 }}>
              {(CONFIG.counts.foliage / 1000).toFixed(0)}K <span style={{ fontSize: '10px', color: '#555', fontWeight: 'normal' }}>EMERALD NEEDLES</span>
            </p>
          </div>
        </div>
      )}

      {/* UI - Buttons */}
      {!showWelcome && (
        <>
          <div style={{ position: 'absolute', bottom: '30px', right: '40px', zIndex: 10, display: 'flex', gap: '10px' }}>
            <button onClick={() => setDebugMode(!debugMode)} style={{ padding: '12px 15px', backgroundColor: debugMode ? '#FFD700' : 'rgba(0,0,0,0.5)', border: '1px solid #FFD700', color: debugMode ? '#000' : '#FFD700', fontFamily: 'sans-serif', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
              {debugMode ? '关闭调试' : 'AI按钮'}
            </button>
            <button onClick={() => setSceneState(s => s === 'CHAOS' ? 'FORMED' : 'CHAOS')} style={{ padding: '12px 30px', backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255, 215, 0, 0.5)', color: '#FFD700', fontFamily: 'serif', fontSize: '14px', fontWeight: 'bold', letterSpacing: '3px', textTransform: 'uppercase', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
              {sceneState === 'CHAOS' ? '生成圣诞树' : '消失'}
            </button>
          </div>

          {/* UI - AI Status */}
          <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', color: aiStatus.includes('ERROR') ? '#FF0000' : 'rgba(255, 215, 0, 0.4)', fontSize: '10px', letterSpacing: '2px', zIndex: 10, background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px' }}>
            {aiStatus}
          </div>
        </>
      )}
    </div>
  );
}