import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    // 確保掛載點存在
    if (!mountRef.current) return;

    // --- 1. 基本場景設定 (Scene Setup) ---
    const scene = new THREE.Scene();
    // 添加一點霧化效果讓背景粒子有深度感
    scene.fog = new THREE.FogExp2(0x0f172a, 0.04); 

    // --- 2. 相機設定 (Camera Setup) ---
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    // --- 3. 渲染器設定 (Renderer Setup) ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // --- 4. 建立 3D 物件 (3D Objects) ---
    
    // 主幾何體：扭結圓環 (Torus Knot)
    const geometry = new THREE.TorusKnotGeometry(1.2, 0.4, 128, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3b82f6, // 對應 Tailwind 的 blue-500
      roughness: 0.1,
      metalness: 0.8,
      wireframe: false,
    });
    const torusKnot = new THREE.Mesh(geometry, material);
    scene.add(torusKnot);

    // 背景粒子系統 (Particles)
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1000;
    const posArray = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
      // 隨機分佈粒子
      posArray[i] = (Math.random() - 0.5) * 20;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.05,
      color: 0x94a3b8, // 對應 Tailwind 的 slate-400
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // --- 5. 光源設定 (Lights) ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 1.5);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);
    
    const blueLight = new THREE.PointLight(0x3b82f6, 2);
    blueLight.position.set(-5, -5, 5);
    scene.add(blueLight);

    // --- 6. 互動與事件監聽 (Interactions & Events) ---
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onDocumentMouseMove = (event: MouseEvent) => {
      // 將滑鼠座標轉換為相對於螢幕中心的數值
      const windowHalfX = window.innerWidth / 2;
      const windowHalfY = window.innerHeight / 2;
      mouseX = (event.clientX - windowHalfX);
      mouseY = (event.clientY - windowHalfY);
    };
    document.addEventListener('mousemove', onDocumentMouseMove);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- 7. 動畫迴圈 (Animation Loop) ---
    const clock = new THREE.Clock();

    const animate = () => {
      requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // 計算目標旋轉角度 (根據滑鼠位置)
      targetX = mouseX * 0.001;
      targetY = mouseY * 0.001;

      // 讓物件平滑地跟隨滑鼠旋轉
      torusKnot.rotation.y += 0.05 * (targetX - torusKnot.rotation.y);
      torusKnot.rotation.x += 0.05 * (targetY - torusKnot.rotation.x);
      // 物件自身的持續微幅旋轉
      torusKnot.rotation.z += 0.005;

      // 讓背景粒子緩慢飄動
      particlesMesh.rotation.y = -0.05 * elapsedTime;
      particlesMesh.rotation.x = 0.02 * elapsedTime;
      
      // 物件些微的上下浮動效果
      torusKnot.position.y = Math.sin(elapsedTime) * 0.2;

      renderer.render(scene, camera);
    };
    animate();

    // --- 8. 清理機制 (Cleanup) ---
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', onDocumentMouseMove);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  // 處理按鈕點擊，顯示提示訊息
  const handleExploreClick = () => {
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 3000);
  };

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden font-sans select-none">
      {/* Three.js 渲染畫布容器 */}
      <div ref={mountRef} className="absolute inset-0 z-0 cursor-crosshair" />

      {/* 提示訊息彈窗 (Toast) */}
      <div 
        className={`fixed top-10 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full shadow-2xl transition-all duration-500 z-50 flex items-center gap-2 ${
          showMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <span className="text-blue-400">✨</span>
        歡迎進入 3D 沉浸式體驗！
      </div>

      {/* 前端 UI 覆蓋層 */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center text-white bg-gradient-to-b from-transparent via-slate-900/20 to-slate-900/80">
        <div className="text-center p-8 backdrop-blur-sm bg-slate-900/10 rounded-3xl border border-white/5 shadow-2xl transform transition-transform hover:scale-105 duration-500">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4 drop-shadow-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">
            互動幾何世界
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-lg mx-auto mb-8 drop-shadow leading-relaxed">
            這是一個使用 React.js 與 Three.js 建構的 3D 空間。試著在畫面上移動滑鼠，觀察物件的動態反應與光影變化。
          </p>
          
          <div className="pointer-events-auto">
            <button
              className="group relative px-8 py-4 bg-blue-600 hover:bg-blue-500 transition-all duration-300 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] overflow-hidden"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={handleExploreClick}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isHovered ? '準備好開始了嗎？' : '開始探索'}
                <svg 
                  className={`w-5 h-5 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
              {/* 按鈕亮點特效 */}
              <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            </button>
          </div>
        </div>
        
        {/* 底部小提示 */}
        <div className="absolute bottom-8 left-0 right-0 text-center text-slate-400 text-sm tracking-widest font-light pointer-events-auto">
          <p className="animate-pulse">MOVE YOUR MOUSE</p>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}} />
    </div>
  );
}