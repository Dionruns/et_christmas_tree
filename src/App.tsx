import { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, extend, useLoader } from '@react-three/fiber';
import {
  OrbitControls,
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
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import * as random from 'maath/random';
import { GestureRecognizer, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import './App.css';
import { getCDNUrl, MEDIAPIPE_WASM_PATH } from './config';
import { SpeedInsights } from "@vercel/speed-insights/react";

// --- 动态生成照片列表 (使用 CDN 配置) ---
// 实际有27张编号照片：1-27.png + top.png
const TOTAL_NUMBERED_PHOTOS = 27;
const bodyPhotoPaths = [
  getCDNUrl('/photos/top.png'),
  ...Array.from({ length: TOTAL_NUMBERED_PHOTOS }, (_, i) => {
    const num = i + 1;
    return getCDNUrl(`/photos/${num}.png`);
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
    foliage: 8042,
    ornaments: 270,   // 拍立得照片数量
    elements: 199.0,    // 圣诞元素数量
    lights: 420       // 彩灯数量
  },
  tree: { height: 27 * 1.990 , radius: 8.42 * 1.990  }, // 树体尺寸
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
      const currentRadius = (rBase * (1 - (y + (h/2)) / h)) + 1.0; // 增加偏移，避免叠加
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
      const angle = t * Math.PI * 2.7*4.2; // 020708042螺旋
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

// --- Custom Environment Component ---
const CustomEnvironment = () => {
  const texture = useLoader(RGBELoader, getCDNUrl('/dikhololo_night_1k.hdr'));
  
  useEffect(() => {
    if (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
    }
  }, [texture]);

  return null;
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
      
      // 目标位置：正面稍微偏右观看圣诞树，能看到完整的树
      const targetPosition = new THREE.Vector3(19.90, 27, 84.2);
      const targetLookAt = new THREE.Vector3(0, -2.7, 0);
      
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
        // 手机触摸支持
        enableDamping={true}
        dampingFactor={0.05}
        // 触摸手势配置
        touches={{
          ONE: THREE.TOUCH.ROTATE,    // 单指旋转
          TWO: THREE.TOUCH.DOLLY_PAN  // 双指缩放和平移
        }}
        // 鼠标按钮配置
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN
        }}
        // 缩放速度
        zoomSpeed={1.2}
        // 旋转速度
        rotateSpeed={0.5}
        // 平移速度
        panSpeed={0.8}
      />

      <color attach="background" args={['#000300']} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Suspense fallback={null}>
        <CustomEnvironment />
      </Suspense>

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
const GestureController = ({ onGesture, onMove, onStatus, debugMode, onLoadProgress }: any) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let gestureRecognizer: GestureRecognizer;
    let requestRef: number;

    const setup = async () => {
      onStatus("正在加载AI模型...");
      
      // 预加载模型文件并显示进度
      const modelUrl = getCDNUrl("/mediapipe-models/gesture_recognizer.task");
      
      try {
        // 先下载模型文件
        let simulatedProgress = 0;
        let progressInterval: number | null = null;
        
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', modelUrl, true);
          xhr.responseType = 'blob';
          
          let hasRealProgress = false;
          
          xhr.onprogress = (event) => {
            if (event.lengthComputable) {
              hasRealProgress = true;
              const progress = Math.floor((event.loaded / event.total) * 100);
              if (onLoadProgress) {
                onLoadProgress(progress);
              }
              onStatus(`正在加载AI模型... ${progress}%`);
            }
          };
          
          xhr.onloadstart = () => {
            // 如果无法获取真实进度，使用模拟进度
            progressInterval = window.setInterval(() => {
              if (!hasRealProgress && simulatedProgress < 90) {
                simulatedProgress += Math.random() * 10;
                simulatedProgress = Math.min(simulatedProgress, 90);
                if (onLoadProgress) {
                  onLoadProgress(Math.floor(simulatedProgress));
                }
                onStatus(`正在加载AI模型... ${Math.floor(simulatedProgress)}%`);
              }
            }, 300);
          };
          
          xhr.onload = () => {
            if (progressInterval) {
              clearInterval(progressInterval);
            }
            if (xhr.status === 200) {
              if (onLoadProgress) {
                onLoadProgress(100);
              }
              onStatus('AI模型加载完成');
              resolve(xhr.response);
            } else {
              reject(new Error('模型加载失败'));
            }
          };
          
          xhr.onerror = () => {
            if (progressInterval) {
              clearInterval(progressInterval);
            }
            reject(new Error('网络错误'));
          };
          
          xhr.send();
        });
        
        // 初始化 MediaPipe
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
        gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelUrl,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        onStatus("正在请求摄像头权限...");
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            onStatus("AI已就绪：请展示手势");
            predictWebcam();
          }
        } else {
            onStatus("错误：摄像头权限被拒绝");
        }
      } catch (err: any) {
        const errorMsg = err.message || '未知错误';
        if (errorMsg.includes('video source')) {
          onStatus("错误：无法启动摄像头");
        } else if (errorMsg.includes('permission')) {
          onStatus("错误：摄像头权限被拒绝");
        } else {
          onStatus(`错误：${errorMsg}`);
        }
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
                 if (debugMode) {
                   const gestureNameCN = name === "Open_Palm" ? "张开手掌" : name === "Closed_Fist" ? "握拳" : name;
                   onStatus(`检测到手势：${gestureNameCN}`);
                 }
              }
              if (results.landmarks.length > 0) {
                const speed = (0.5 - results.landmarks[0][0].x) * 0.15;
                onMove(Math.abs(speed) > 0.01 ? speed : 0);
              }
            } else { onMove(0); if (debugMode) onStatus("AI已就绪：未检测到手势"); }
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
  const [aiStatus, setAiStatus] = useState("AI未启用");
  const [debugMode, setDebugMode] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [userName, setUserName] = useState('');
  const [inputName, setInputName] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hideUI, setHideUI] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [displayedText, setDisplayedText] = useState('');
  const [showGreeting, setShowGreeting] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('初始化...');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiLoadingProgress, setAiLoadingProgress] = useState(0);
  const [showAiLoading, setShowAiLoading] = useState(false);

  // 预加载资源 - 修复版本，确保所有资源加载完成后才显示
  useEffect(() => {
    let actualLoadedCount = 0;
    let displayProgress = 0;
    const totalResources = CONFIG.photos.body.length + 2; // 照片 + HDR环境贴图 + 字体
    let allResourcesLoaded = false;
    
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
      
      // 只有当所有资源都加载完成且进度达到100%时才关闭加载界面
      if (displayProgress >= 100 && allResourcesLoaded) {
        clearInterval(smoothProgressInterval);
        setTimeout(() => {
          setIsLoading(false);
        }, 300);
      }
    }, 30);
    
    // 预加载照片
    const imagePromises = CONFIG.photos.body.map((path) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          actualLoadedCount++;
          resolve(true);
        };
        img.onerror = () => {
          console.warn('图片加载失败:', path);
          actualLoadedCount++;
          resolve(false);
        };
        img.src = path;
      });
    });

    // 预加载 HDR 环境贴图
    let hdrLoaded = false;
    const hdrPromise = new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', getCDNUrl('/dikhololo_night_1k.hdr'), true);
      xhr.onload = () => {
        if (!hdrLoaded) {
          hdrLoaded = true;
          actualLoadedCount++;
        }
        resolve(true);
      };
      xhr.onerror = () => {
        console.warn('HDR 加载失败');
        if (!hdrLoaded) {
          hdrLoaded = true;
          actualLoadedCount++;
        }
        resolve(false);
      };
      xhr.send();
    });

    // 预加载字体
    let fontLoaded = false;
    const fontPromise = new Promise((resolve) => {
      const fontFace = new FontFace('HandWriting', `url(${getCDNUrl('/全新硬笔行书简.ttf')})`);
      fontFace.load().then((loadedFont) => {
        document.fonts.add(loadedFont);
        if (!fontLoaded) {
          fontLoaded = true;
          actualLoadedCount++;
        }
        resolve(true);
      }).catch(() => {
        console.warn('字体加载失败');
        if (!fontLoaded) {
          fontLoaded = true;
          actualLoadedCount++;
        }
        resolve(false);
      });
    });

    // 等待所有资源加载完成
    Promise.all([...imagePromises, hdrPromise, fontPromise]).then(() => {
      actualLoadedCount = totalResources;
      allResourcesLoaded = true;
    });

    return () => clearInterval(smoothProgressInterval);
  }, []);

  // 监听 AI 加载进度，完成后关闭弹窗
  useEffect(() => {
    if (aiLoadingProgress >= 100 && showAiLoading) {
      setTimeout(() => {
        setShowAiLoading(false);
      }, 500); // 显示100%后延迟500ms关闭
    }
  }, [aiLoadingProgress, showAiLoading]);

  // 打字机效果
  useEffect(() => {
    if (sceneState === 'FORMED' && userName && !showWelcome) {
      // 延迟2秒后开始打字
      const startDelay = setTimeout(() => {
        setShowGreeting(true);
        const fullText = `To: ${userName}\n天天开心`;
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

  // 全屏切换
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('无法进入全屏:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 双击/双触摸画面恢复UI显示
  useEffect(() => {
    let lastTap = 0;
    
    const handleDoubleClick = () => {
      if (hideUI) {
        setHideUI(false);
      }
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      
      if (tapLength < 300 && tapLength > 0) {
        // 双击检测成功
        if (hideUI) {
          setHideUI(false);
        }
        e.preventDefault();
      }
      lastTap = currentTime;
    };
    
    const container = containerRef.current;
    if (container) {
      // 桌面端双击
      container.addEventListener('dblclick', handleDoubleClick);
      // 移动端双触摸
      container.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        container.removeEventListener('dblclick', handleDoubleClick);
        container.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [hideUI]);

  // 截图功能 - 包含祝福语的完整截图
  const takeScreenshot = () => {
    // 先隐藏UI（但保留祝福语）
    setHideUI(true);
    
    // 等待UI隐藏后再截图
    setTimeout(() => {
      const container = containerRef.current;
      if (container) {
        try {
          // 使用 html2canvas 库的替代方案：手动合成
          const canvas = document.querySelector('canvas') as HTMLCanvasElement;
          const greetingElement = document.querySelector('.greeting-message') as HTMLElement;
          
          if (canvas) {
            // 创建一个新的 canvas 来合成最终图像
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = canvas.width;
            finalCanvas.height = canvas.height;
            const ctx = finalCanvas.getContext('2d');
            
            if (ctx) {
              // 绘制 WebGL canvas
              ctx.drawImage(canvas, 0, 0);
              
              // 如果有祝福语，将其绘制到 canvas 上
              if (greetingElement && showGreeting) {
                const rect = greetingElement.getBoundingClientRect();
                const canvasRect = canvas.getBoundingClientRect();
                
                // 计算祝福语在 canvas 上的位置
                const scaleX = canvas.width / canvasRect.width;
                const scaleY = canvas.height / canvasRect.height;
                const x = (rect.left - canvasRect.left) * scaleX;
                const y = (rect.top - canvasRect.top) * scaleY;
                
                // 获取实际的字体大小
                const textElement = greetingElement.querySelector('.handwriting-text') as HTMLElement;
                const computedStyle = textElement ? window.getComputedStyle(textElement) : null;
                const actualFontSize = computedStyle ? parseFloat(computedStyle.fontSize) : 32;
                const actualLineHeight = computedStyle ? parseFloat(computedStyle.lineHeight) : 45;
                
                // 绘制文字（不绘制背景和边框）
                ctx.fillStyle = '#FFD700';
                ctx.font = `${actualFontSize * scaleX}px HandWriting, KaiTi, cursive`;
                ctx.textAlign = 'right';
                ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
                ctx.shadowBlur = 20 * scaleX;
                
                const lines = displayedText.split('\n');
                lines.forEach((line, i) => {
                  ctx.fillText(line, x + rect.width * scaleX - 20 * scaleX, y + (actualFontSize + i * actualLineHeight) * scaleY);
                });
              }
              
              // 下载图片
              const dataURL = finalCanvas.toDataURL('image/png');
              const link = document.createElement('a');
              link.download = `圣诞树-${userName || '截图'}-${new Date().getTime()}.png`;
              link.href = dataURL;
              link.click();
            }
          }
        } catch (err) {
          console.error('截图失败:', err);
          alert('截图失败，请重试');
        }
      }
      
      // 恢复UI显示
      setTimeout(() => setHideUI(false), 100);
    }, 100);
  };

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', backgroundColor: '#000', position: 'relative', overflow: 'hidden' }}>
      {/* Welcome Modal */}
      {showWelcome && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `url(${getCDNUrl(window.innerWidth <= 768 ? '/photos/phone_bg.png' : '/photos/bg.png')})`,
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
              fontSize: '84.2px',
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
            
            {/* 版权声明 */}
            <p style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '12px',
              marginTop: '20px',
              lineHeight: '1.6',
              textAlign: 'center',
              fontFamily: 'sans-serif'
            }}>
              本网站图片来源：华晨宇工作室（微博）<br />
              若有侵权，联系作者删除<br />
              邮箱：<a href="mailto:Dionruns@163.com" style={{ color: 'rgba(255, 215, 0, 0.7)', textDecoration: 'none' }}>Dionruns@163.com</a>
            </p>
          </div>
        </div>
      )}

      <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
        <Canvas 
          dpr={[1, 2]} 
          gl={{ 
            toneMapping: THREE.ReinhardToneMapping,
            preserveDrawingBuffer: true  // 允许截图
          }} 
          shadows
        >
            <Experience sceneState={sceneState} rotationSpeed={rotationSpeed} userName={userName} />
        </Canvas>
      </div>
      {!showWelcome && aiEnabled && <GestureController onGesture={setSceneState} onMove={setRotationSpeed} onStatus={setAiStatus} debugMode={debugMode} onLoadProgress={setAiLoadingProgress} />}

      {/* Greeting Message Overlay - 右上角显示 */}
      {showGreeting && displayedText && (
        <div 
          className="greeting-message"
          style={{
            position: 'absolute',
            top: window.innerWidth <= 768 ? '18%' : '20%',
            right: window.innerWidth <= 768 ? '30px' : '120px',
            zIndex: 20,
            pointerEvents: 'none',
            opacity: hideUI ? 0 : 1,
            transition: 'opacity 0.3s ease'
          }}
        >
          <div 
            className="handwriting-text"
            style={{
              fontSize: window.innerWidth <= 768 ? '27px' : '84.2px',
              fontWeight: 'normal',
              color: '#FFD700',
              textAlign: 'left',
              textShadow: '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.5)',
              letterSpacing: window.innerWidth <= 768 ? '1px' : '3px',
              lineHeight: '1.8',
              whiteSpace: 'pre-wrap'
            }}
          >
            {displayedText}
          </div>
        </div>
      )}

      {/* UI - Stats */}
      {!showWelcome && !hideUI && (
        <div style={{ 
          position: 'absolute', 
          top: window.innerWidth <= 768 ? '60px' : '80px', 
          left: window.innerWidth <= 768 ? '15px' : '40px', 
          color: '#888', 
          zIndex: 10, 
          fontFamily: 'sans-serif', 
          userSelect: 'none',
          fontSize: window.innerWidth <= 768 ? '0.85em' : '1em'
        }}>
          {userName && (
            <div style={{ marginBottom: window.innerWidth <= 768 ? '10px' : '20px' }}>
              <p style={{ fontSize: window.innerWidth <= 768 ? '12px' : '14px', color: '#FFD700', fontWeight: 'bold', margin: 0 }}>
                🎅 {userName} 的圣诞树
              </p>
            </div>
          )}
          <div style={{ marginBottom: window.innerWidth <= 768 ? '10px' : '15px' }}>
            <p style={{ fontSize: window.innerWidth <= 768 ? '8px' : '10px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>照片数量</p>
            <p style={{ fontSize: window.innerWidth <= 768 ? '18px' : '24px', color: '#FFD700', fontWeight: 'bold', margin: 0 }}>
              {CONFIG.counts.ornaments.toLocaleString()} <span style={{ fontSize: window.innerWidth <= 768 ? '8px' : '10px', color: '#555', fontWeight: 'normal' }}>张</span>
            </p>
          </div>
          <div>
            <p style={{ fontSize: window.innerWidth <= 768 ? '8px' : '10px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>针叶数量</p>
            <p style={{ fontSize: window.innerWidth <= 768 ? '18px' : '24px', color: '#004225', fontWeight: 'bold', margin: 0 }}>
              0{(CONFIG.counts.foliage).toFixed(0)} <span style={{ fontSize: window.innerWidth <= 768 ? '8px' : '10px', color: '#555', fontWeight: 'normal' }}>片</span>
            </p>
          </div>
        </div>
      )}

      {/* UI - Buttons */}
      {!showWelcome && !hideUI && (
        <>
          <div style={{ 
            position: 'absolute', 
            bottom: window.innerWidth <= 768 ? '15px' : '30px', 
            right: window.innerWidth <= 768 ? '15px' : '40px', 
            zIndex: 10, 
            display: 'flex', 
            flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
            gap: '10px' 
          }}>
            <button 
              onClick={() => {
                if (!aiEnabled) {
                  setShowAiPrompt(true);
                } else {
                  setDebugMode(!debugMode);
                }
              }}
              style={{ 
                padding: window.innerWidth <= 768 ? '10px 12px' : '12px 15px', 
                backgroundColor: (aiEnabled && debugMode) ? '#FFD700' : 'rgba(0,0,0,0.5)', 
                border: '1px solid #FFD700', 
                color: (aiEnabled && debugMode) ? '#000' : '#FFD700', 
                fontFamily: 'sans-serif', 
                fontSize: window.innerWidth <= 768 ? '11px' : '12px', 
                fontWeight: 'bold', 
                cursor: 'pointer', 
                backdropFilter: 'blur(4px)',
                borderRadius: '8px',
                whiteSpace: 'nowrap'
              }}
            >
              {aiEnabled ? (debugMode ? '关闭AI摄像头' : 'AI摄像头识别') : '启用AI手势'}
            </button>
            <button 
              onClick={() => setSceneState(s => s === 'CHAOS' ? 'FORMED' : 'CHAOS')} 
              style={{ 
                padding: window.innerWidth <= 768 ? '10px 20px' : '12px 30px', 
                backgroundColor: 'rgba(0,0,0,0.5)', 
                border: '1px solid rgba(255, 215, 0, 0.5)', 
                color: '#FFD700', 
                fontFamily: 'serif', 
                fontSize: window.innerWidth <= 768 ? '12px' : '14px', 
                fontWeight: 'bold', 
                letterSpacing: window.innerWidth <= 768 ? '2px' : '3px', 
                textTransform: 'uppercase', 
                cursor: 'pointer', 
                backdropFilter: 'blur(4px)',
                borderRadius: '8px'
              }}
            >
              {sceneState === 'CHAOS' ? '生成圣诞树' : '消失'}
            </button>
          </div>

          {/* 左下角功能按钮 - 可隐藏部分 */}
          {!hideUI && (
            <div style={{ 
              position: 'absolute', 
              bottom: window.innerWidth <= 768 ? '15px' : '30px', 
              left: window.innerWidth <= 768 ? '15px' : '40px', 
              zIndex: 10, 
              display: 'flex', 
              flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
              gap: '10px',
              alignItems: 'flex-start'
            }}>
              <button 
                onClick={takeScreenshot}
                title="截图保存"
                style={{ 
                  padding: window.innerWidth <= 768 ? '10px' : '12px', 
                  backgroundColor: 'rgba(0,0,0,0.5)', 
                  border: '1px solid rgba(255, 215, 0, 0.5)', 
                  color: '#FFD700', 
                  fontFamily: 'sans-serif', 
                  fontSize: window.innerWidth <= 768 ? '18px' : '20px', 
                  cursor: 'pointer', 
                  backdropFilter: 'blur(4px)',
                  borderRadius: '8px',
                  lineHeight: '1',
                  width: window.innerWidth <= 768 ? '40px' : '44px',
                  height: window.innerWidth <= 768 ? '40px' : '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                📷
              </button>
              <button 
                onClick={toggleFullscreen}
                title={isFullscreen ? '退出全屏' : '进入全屏'}
                style={{ 
                  padding: window.innerWidth <= 768 ? '10px' : '12px', 
                  backgroundColor: isFullscreen ? 'rgba(255, 215, 0, 0.3)' : 'rgba(0,0,0,0.5)', 
                  border: '1px solid rgba(255, 215, 0, 0.5)', 
                  color: '#FFD700', 
                  fontFamily: 'sans-serif', 
                  fontSize: window.innerWidth <= 768 ? '20px' : '22px', 
                  cursor: 'pointer', 
                  backdropFilter: 'blur(4px)',
                  borderRadius: '8px',
                  lineHeight: '1',
                  width: window.innerWidth <= 768 ? '40px' : '44px',
                  height: window.innerWidth <= 768 ? '40px' : '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isFullscreen ? '⊡' : '⛶'}
              </button>
            </div>
          )}

          {/* 隐藏UI按钮 - 始终显示 */}
          <button 
            onClick={() => setHideUI(!hideUI)}
            title={hideUI ? '显示UI' : '隐藏UI'}
            style={{ 
              position: 'absolute',
              bottom: window.innerWidth <= 768 ? '15px' : '30px', 
              left: hideUI ? (window.innerWidth <= 768 ? '15px' : '40px') : (window.innerWidth <= 768 ? '15px' : '138px'),
              zIndex: 11,
              padding: window.innerWidth <= 768 ? '10px' : '12px', 
              backgroundColor: hideUI ? '#FFD700' : 'rgba(0,0,0,0.5)', 
              border: '1px solid rgba(255, 215, 0, 0.5)', 
              color: hideUI ? '#000' : '#FFD700', 
              fontFamily: 'sans-serif', 
              fontSize: window.innerWidth <= 768 ? '18px' : '20px', 
              cursor: 'pointer', 
              backdropFilter: 'blur(4px)',
              borderRadius: '8px',
              lineHeight: '1',
              width: window.innerWidth <= 768 ? '40px' : '44px',
              height: window.innerWidth <= 768 ? '40px' : '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease'
            }}
          >
            {hideUI ? '👁️' : '🙈'}
          </button>

          {/* UI - AI Status */}
          <div style={{ 
            position: 'absolute', 
            top: window.innerWidth <= 768 ? '10px' : '20px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            color: aiStatus.includes('ERROR') ? '#FF0000' : 'rgba(255, 215, 0, 0.4)', 
            fontSize: window.innerWidth <= 768 ? '9px' : '10px', 
            letterSpacing: window.innerWidth <= 768 ? '1px' : '2px', 
            zIndex: 10, 
            background: 'rgba(0,0,0,0.5)', 
            padding: window.innerWidth <= 768 ? '3px 6px' : '4px 8px', 
            borderRadius: '4px',
            maxWidth: window.innerWidth <= 768 ? '80%' : 'auto',
            textAlign: 'center'
          }}>
            {aiStatus}
          </div>
        </>
      )}

      {/* AI 加载进度弹窗 */}
      {showAiLoading && aiLoadingProgress < 100 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.9)',
            border: '2px solid #FFD700',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '90%',
            width: '400px',
            textAlign: 'center',
            boxShadow: '0 0 50px rgba(255, 215, 0, 0.3)'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>🤖</div>
            <h2 style={{
              color: '#FFD700',
              fontFamily: 'sans-serif',
              fontSize: '20px',
              marginBottom: '20px',
              fontWeight: 'bold'
            }}>
              正在加载 AI 模型
            </h2>
            <div style={{
              width: '100%',
              height: '10px',
              backgroundColor: 'rgba(255, 215, 0, 0.2)',
              borderRadius: '5px',
              overflow: 'hidden',
              marginBottom: '15px',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{
                width: `${aiLoadingProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite',
                transition: 'width 0.3s ease',
                boxShadow: '0 0 15px rgba(255, 215, 0, 0.8)',
                borderRadius: '5px'
              }} />
            </div>
            <p style={{
              color: '#FFD700',
              fontSize: '18px',
              margin: 0,
              fontFamily: 'sans-serif',
              fontWeight: 'bold'
            }}>
              {aiLoadingProgress}%
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '13px',
              marginTop: '10px',
              fontFamily: 'sans-serif'
            }}>
              约 8 MB，请稍候...
            </p>
          </div>
        </div>
      )}

      {/* AI 启用确认弹窗 */}
      {showAiPrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.9)',
            border: '2px solid #FFD700',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '90%',
            width: '450px',
            textAlign: 'center',
            boxShadow: '0 0 50px rgba(255, 215, 0, 0.3)'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>🤖</div>
            <h2 style={{
              color: '#FFD700',
              fontFamily: 'sans-serif',
              fontSize: '24px',
              marginBottom: '15px',
              fontWeight: 'bold'
            }}>
              启用 AI 手势识别
            </h2>
            <p style={{
              color: '#ECEFF1',
              fontFamily: 'sans-serif',
              fontSize: '15px',
              lineHeight: '1.6',
              marginBottom: '20px'
            }}>
              此功能需要加载 AI 模型文件<br />
              <span style={{ color: '#FFD700', fontWeight: 'bold' }}>约 8 MB 流量</span><br />
              <br />
              启用后可以使用手势控制：<br />
              • 张开手掌 = 消失<br />
              • 握拳 = 生成圣诞树<br />
              • 左右移动手掌 = 旋转视角
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowAiPrompt(false)}
                style={{
                  padding: '12px 30px',
                  fontSize: '16px',
                  fontFamily: 'sans-serif',
                  fontWeight: 'bold',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#ECEFF1',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                取消
              </button>
              <button
                onClick={() => {
                  setAiEnabled(true);
                  setShowAiPrompt(false);
                  setShowAiLoading(true);
                  setAiLoadingProgress(0);
                  setAiStatus("正在加载AI模型...");
                }}
                style={{
                  padding: '12px 30px',
                  fontSize: '16px',
                  fontFamily: 'sans-serif',
                  fontWeight: 'bold',
                  backgroundColor: '#FFD700',
                  color: '#000',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
                  transition: 'all 0.3s'
                }}
              >
                启用 (8 MB)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vercel Speed Insights */}
      <SpeedInsights />
    </div>
  );
}