/* ==========================================================================
   CHILI FARM OS — Visual Digital Twin & Motion Engine
   Handles: 1. Animated Telemetry Canvas (Real photos + particle physics)
            2. Interactive 3D Digital Twin (Three.js with live actuator controls)
   ========================================================================== */

const VisualTwin = {
  currentMode: 'motion', // 'motion' | 'three'
  activeView: 'front',   // 'front' | 'top'
  relayState: { pump: false, light: true },
  telemetry: {
    moisture: 51.2, EC: 0.85, pH: 6.4, N: 85, P: 160, K: 210,
    temperature: 28.5, humidity: 76.0, light: 14.2, soiltemp: 27.2
  },
  particles: [],
  animFrameId: null,
  images: {},
  hotspots: {
    front: [
      { id: 'controller', x: 0.54, y: 0.14, r: 24, name: 'Bộ điều khiển IoT', desc: 'ESP32 + Wi-Fi + Màn hình LCD', val: 'Trực tuyến (Online)' },
      { id: 'sensor',     x: 0.40, y: 0.81, r: 26, name: 'Cảm biến đất 7in1', desc: 'Đo NPK, pH, EC, Ẩm đất, Nhiệt độ đất', val: '51.2 %VWC · 0.85 mS/cm' },
      { id: 'motor',      x: 0.64, y: 0.58, r: 22, name: 'Motor tưới (Bơm)', desc: 'Bơm nước từ nguồn qua béc phun', val: 'Nhấn để Bật/Tắt' },
      { id: 'nozzle',     x: 0.34, y: 0.36, r: 20, name: 'Béc tưới cây', desc: 'Đầu phun sương hạt mịn', val: 'Nhấn để Bật/Tắt' },
      { id: 'light',      x: 0.72, y: 0.32, r: 20, name: 'Đèn chiếu sáng LED', desc: 'Dải LED quang hợp trên khung nhôm', val: 'Nhấn để Bật/Tắt' }
    ],
    top: [
      { id: 'nozzle',     x: 0.32, y: 0.36, r: 22, name: 'Béc tưới cây', desc: 'Béc phun sương hướng vào khay ớt', val: 'Vị trí góc trái' },
      { id: 'light',      x: 0.78, y: 0.33, r: 22, name: 'Đèn chiếu sáng', desc: 'Thanh LED gắn khung nhôm', val: 'Nhấn để Bật/Tắt' },
      { id: 'controller', x: 0.57, y: 0.14, r: 24, name: 'Bộ điều khiển IoT', desc: 'Hộp nhôm chứa mạch và LCD', val: 'ESP32 Controller' },
      { id: 'plants',     x: 0.56, y: 0.78, r: 28, name: 'Khay cây trồng', desc: 'Đất xốp trong thùng xốp cách nhiệt', val: 'Sinh trưởng tốt' }
    ]
  },
  hoveredHotspot: null,
  mousePos: { x: 0, y: 0 }
};

/* Preload Real Images */
VisualTwin.init = async function() {
  const loadImg = (src) => new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

  const [front, top] = await Promise.all([
    loadImg('assets/rig_front.jpeg?v=20261028_12'),
    loadImg('assets/rig_top.jpeg?v=20261028_12')
  ]);

  this.images.front = front;
  this.images.top = top;

  this.setupModeTabs();
  this.initMotionCanvas();
  this.initThreeRig();
  this.startAnimationLoop();
};

/* --------------------------------------------------------------------------
   MODE 1: ANIMATED TELEMETRY RIG (REAL HARDWARE PHOTOS + PARTICLE PHYSICS)
   -------------------------------------------------------------------------- */
VisualTwin.initMotionCanvas = function() {
  const canvas = document.getElementById('canvas-motion');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  this.motionCanvas = canvas;
  this.motionCtx = ctx;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  };
  window.addEventListener('resize', resize);
  resize();

  // Mouse move for hotspot interaction
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    this.mousePos = { x: clientX, y: clientY };

    const spots = this.hotspots[this.activeView] || [];
    const b = this.imgBounds || { dx: 0, dy: 0, dw: rect.width, dh: rect.height };
    let found = null;
    for (const h of spots) {
      const hx = b.dx + b.dw * h.x;
      const hy = b.dy + b.dh * h.y;
      const dx = clientX - hx;
      const dy = clientY - hy;
      if (Math.sqrt(dx * dx + dy * dy) <= h.r) {
        found = h;
        break;
      }
    }
    this.hoveredHotspot = found;
    canvas.style.cursor = found ? 'pointer' : 'default';
  });

  canvas.addEventListener('click', () => {
    if (this.hoveredHotspot) {
      if (this.hoveredHotspot.id === 'motor' || this.hoveredHotspot.id === 'nozzle') {
        this.togglePump();
      } else if (this.hoveredHotspot.id === 'light') {
        this.toggleLight();
      }
    }
  });
};

/* Render 2D Motion Frame */
VisualTwin.renderMotionCanvas = function(now) {
  const canvas = this.motionCanvas;
  if (!canvas || this.currentMode !== 'motion') return;
  const ctx = this.motionCtx;
  const rect = canvas.getBoundingClientRect();
  const W = rect.width, H = rect.height;

  ctx.clearRect(0, 0, W, H);

  // 1. Draw Real Rig Photo (Cover mode - fills 100% frame without any gray borders)
  const img = this.images[this.activeView] || this.images.front;
  if (img && img.naturalWidth) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(W / iw, H / ih);
    const dw = iw * scale, dh = ih * scale;
    const dx = (W - dw) / 2, dy = (H - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
    this.imgBounds = { dx, dy, dw, dh };
  } else {
    ctx.fillStyle = '#edf4ef';
    ctx.fillRect(0, 0, W, H);
  }

  const b = this.imgBounds || { dx: 0, dy: 0, dw: W, dh: H };

  // 2. Animated Particle Effects (Water mist from nozzle)
  if (this.relayState.pump) {
    const nozzlePos = this.activeView === 'front' 
      ? { x: b.dx + b.dw * 0.34, y: b.dy + b.dh * 0.36 }
      : { x: b.dx + b.dw * 0.32, y: b.dy + b.dh * 0.36 };

    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: nozzlePos.x + (Math.random() - 0.5) * 6,
        y: nozzlePos.y + (Math.random() - 0.5) * 6,
        vx: 1.5 + Math.random() * 3.5,
        vy: 2.5 + Math.random() * 4.0,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.85 + Math.random() * 0.15,
        life: 0,
        maxLife: 35 + Math.random() * 20
      });
    }
  }

  // Draw Mist Particles
  ctx.save();
  for (let i = this.particles.length - 1; i >= 0; i--) {
    const p = this.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.life++;
    const progress = p.life / p.maxLife;
    const currentAlpha = p.alpha * (1 - progress);

    ctx.fillStyle = `rgba(2, 132, 199, ${currentAlpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (1 + progress * 0.8), 0, Math.PI * 2);
    ctx.fill();

    if (p.life >= p.maxLife) {
      this.particles.splice(i, 1);
    }
  }
  ctx.restore();

  // 3. Glowing LED Strip Animation (when light is ON)
  if (this.relayState.light) {
    ctx.save();
    const lightGlow = Math.sin(now * 0.003) * 0.15 + 0.85;
    const lightX = this.activeView === 'front' ? b.dx + b.dw * 0.72 : b.dx + b.dw * 0.78;
    const lightY = this.activeView === 'front' ? b.dy + b.dh * 0.32 : b.dy + b.dh * 0.33;
    const grad = ctx.createRadialGradient(lightX, lightY, 5, lightX, lightY, 95);
    grad.addColorStop(0, `rgba(255, 255, 220, ${0.55 * lightGlow})`);
    grad.addColorStop(0.5, `rgba(255, 240, 160, ${0.22 * lightGlow})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(lightX, lightY, 95, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 4. Sensor 7-in-1 Data Pulse Waves in Soil
  if (this.activeView === 'front') {
    const sensorX = b.dx + b.dw * 0.40;
    const sensorY = b.dy + b.dh * 0.81;
    const pulsePhase = (now % 2500) / 2500;
    const radius = 10 + pulsePhase * 45;
    const alpha = (1 - pulsePhase) * 0.65;

    ctx.save();
    ctx.strokeStyle = `rgba(4, 120, 87, ${alpha})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(sensorX, sensorY, radius, 0, Math.PI * 2);
    ctx.stroke();

    const pulsePhase2 = ((now + 1200) % 2500) / 2500;
    const radius2 = 10 + pulsePhase2 * 45;
    const alpha2 = (1 - pulsePhase2) * 0.5;
    ctx.strokeStyle = `rgba(2, 132, 199, ${alpha2})`;
    ctx.beginPath();
    ctx.arc(sensorX, sensorY, radius2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 5. Draw Interactive Hotspots
  const spots = this.hotspots[this.activeView] || [];
  spots.forEach((h) => {
    const hx = b.dx + b.dw * h.x;
    const hy = b.dy + b.dh * h.y;
    const isHovered = this.hoveredHotspot && this.hoveredHotspot.id === h.id;

    ctx.save();
    const pulse = Math.sin(now * 0.005 + h.x * 10) * 0.2 + 0.8;
    ctx.fillStyle = isHovered ? 'rgba(5, 150, 105, 0.45)' : `rgba(4, 120, 87, ${0.28 * pulse})`;
    ctx.beginPath();
    ctx.arc(hx, hy, isHovered ? h.r + 4 : h.r * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isHovered ? '#059669' : '#047857';
    ctx.lineWidth = isHovered ? 2.5 : 1.8;
    ctx.beginPath();
    ctx.arc(hx, hy, h.r * 0.65, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = isHovered ? '#ffffff' : '#10b981';
    ctx.beginPath();
    ctx.arc(hx, hy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 6. Draw Tooltip when Hovered
  if (this.hoveredHotspot) {
    const h = this.hoveredHotspot;
    const hx = b.dx + b.dw * h.x;
    const hy = b.dy + b.dh * h.y - h.r - 12;

    ctx.save();
    ctx.font = 'bold 13px Inter, sans-serif';
    const textName = h.name;
    const textVal = h.val;
    const tw = Math.max(ctx.measureText(textName).width, ctx.measureText(textVal).width) + 24;
    const th = 48;
    const tx = Math.min(Math.max(hx - tw / 2, 10), W - tw - 10);
    const ty = Math.max(hy - th, 10);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, th, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#062015';
    ctx.fillText(textName, tx + 12, ty + 19);
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#047857';
    ctx.fillText(textVal, tx + 12, ty + 38);
    ctx.restore();
  }
};

/* --------------------------------------------------------------------------
   MODE 2: 3D DIGITAL TWIN (THREE.JS WITH REAL-TIME ACTUATOR EFFECTS)
   -------------------------------------------------------------------------- */
VisualTwin.initThreeRig = function() {
  const container = document.getElementById('three-container');
  if (!container || typeof THREE === 'undefined') return;

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 440;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf2f7f4);
  scene.fog = new THREE.FogExp2(0xf2f7f4, 0.015);

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(2.8, 2.3, 3.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  let controls = null;
  if (typeof THREE.OrbitControls !== 'undefined') {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.04;
    controls.minDistance = 1.6;
    controls.maxDistance = 6.0;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.target.set(0, 0.45, 0);
  }

  // Ambient & Directional Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(3, 5, 2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  scene.add(keyLight);

  // Grow LED Point Light on Rig (Linked to Relay 2)
  const ledLight = new THREE.PointLight(0xfffae6, 2.4, 4.0);
  ledLight.position.set(0, 1.15, 0);
  scene.add(ledLight);
  this.threeLedLight = ledLight;

  // Rig Group
  const rigGroup = new THREE.Group();

  // Materials
  const aluminumMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.9,
    roughness: 0.2
  });
  const foamMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.9,
    metalness: 0.05
  });
  const soilMat = new THREE.MeshStandardMaterial({
    color: 0x271e16,
    roughness: 0.95
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    roughness: 0.5,
    side: THREE.DoubleSide
  });
  const controllerMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.7,
    roughness: 0.3
  });
  const lcdScreenMat = new THREE.MeshBasicMaterial({
    color: 0x0284c7
  });

  // Aluminum Frame Beams (L=1.8, W=1.2, H=1.2)
  const L = 1.8, W = 1.2, H = 1.2, beamR = 0.025;
  const addBeam = (x1, y1, z1, x2, y2, z2) => {
    const v1 = new THREE.Vector3(x1, y1, z1);
    const v2 = new THREE.Vector3(x2, y2, z2);
    const dist = v1.distanceTo(v2);
    const geom = new THREE.BoxGeometry(beamR * 2, dist, beamR * 2);
    const mesh = new THREE.Mesh(geom, aluminumMat);
    mesh.position.copy(v1.clone().add(v2).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v2.clone().sub(v1).normalize());
    mesh.castShadow = true;
    rigGroup.add(mesh);
  };

  const hx = L / 2, hz = W / 2;
  // 4 Vertical Pillars
  addBeam(-hx, 0, -hz, -hx, H, -hz);
  addBeam(hx, 0, -hz, hx, H, -hz);
  addBeam(hx, 0, hz, hx, H, hz);
  addBeam(-hx, 0, hz, -hx, H, hz);

  // Bottom Beams
  addBeam(-hx, 0.05, -hz, hx, 0.05, -hz);
  addBeam(hx, 0.05, -hz, hx, 0.05, hz);
  addBeam(hx, 0.05, hz, -hx, 0.05, hz);
  addBeam(-hx, 0.05, hz, -hx, 0.05, -hz);

  // Top Beams
  addBeam(-hx, H, -hz, hx, H, -hz);
  addBeam(hx, H, -hz, hx, H, hz);
  addBeam(hx, H, hz, -hx, H, hz);
  addBeam(-hx, H, hz, -hx, H, -hz);

  // Top Light Strips (Dual LED tubes)
  const tubeGeom = new THREE.CylinderGeometry(0.016, 0.016, L - 0.12, 16);
  const tubeMat1 = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
  const tubeMat2 = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
  const tube1 = new THREE.Mesh(tubeGeom, tubeMat1);
  tube1.rotation.z = Math.PI / 2;
  tube1.position.set(0, H - 0.04, -hz * 0.5);
  rigGroup.add(tube1);

  const tube2 = new THREE.Mesh(tubeGeom, tubeMat2);
  tube2.rotation.z = Math.PI / 2;
  tube2.position.set(0, H - 0.04, hz * 0.5);
  rigGroup.add(tube2);
  this.threeTubes = [tube1, tube2];

  // Styrofoam Container
  const foamBox = new THREE.Mesh(
    new THREE.BoxGeometry(L - 0.14, 0.35, W - 0.14),
    foamMat
  );
  foamBox.position.set(0, 0.22, 0);
  foamBox.castShadow = true;
  foamBox.receiveShadow = true;
  rigGroup.add(foamBox);

  // Soil Bed
  const soil = new THREE.Mesh(
    new THREE.BoxGeometry(L - 0.20, 0.05, W - 0.20),
    soilMat
  );
  soil.position.set(0, 0.38, 0);
  soil.receiveShadow = true;
  rigGroup.add(soil);

  // Plants
  const plantPositions = [
    [-0.5, 0.40, -0.2], [-0.15, 0.40, -0.2], [0.2, 0.40, -0.2], [0.55, 0.40, -0.2],
    [-0.35, 0.40, 0.2], [0.0, 0.40, 0.2], [0.35, 0.40, 0.2]
  ];
  plantPositions.forEach(([px, py, pz]) => {
    const plant = new THREE.Group();
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.010, 0.15, 8),
      new THREE.MeshStandardMaterial({ color: 0x22c55e })
    );
    stem.position.y = 0.075;
    plant.add(stem);

    for (let j = 0; j < 4; j++) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.045), leafMat);
      leaf.position.set(0, 0.13, 0);
      leaf.rotation.y = (j * Math.PI) / 2;
      leaf.rotation.x = 0.5;
      plant.add(leaf);
    }
    plant.position.set(px, py, pz);
    rigGroup.add(plant);
  });

  // Sensor 7in1 Probe
  const probeGroup = new THREE.Group();
  const probeBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.065, 0.095, 0.035),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
  );
  probeBody.position.y = 0.048;
  probeGroup.add(probeBody);

  for (let k = -1; k <= 1; k++) {
    const prong = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.08, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 })
    );
    prong.position.set(k * 0.015, -0.04, 0);
    probeGroup.add(prong);
  }
  const cableGeom = new THREE.CylinderGeometry(0.004, 0.004, 0.7, 8);
  const cable = new THREE.Mesh(cableGeom, new THREE.MeshBasicMaterial({ color: 0x0f172a }));
  cable.position.set(0, 0.38, 0);
  probeGroup.add(cable);

  probeGroup.position.set(-0.25, 0.39, 0.05);
  rigGroup.add(probeGroup);

  // Top IoT Control Box with LCD
  const ctrlBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.34, 0.12),
    controllerMat
  );
  ctrlBox.position.set(0, H + 0.17, -hz);
  ctrlBox.castShadow = true;
  rigGroup.add(ctrlBox);

  const lcdFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.18),
    lcdScreenMat
  );
  lcdFace.position.set(0, H + 0.17, -hz + 0.062);
  rigGroup.add(lcdFace);

  // Mist Nozzle (Béc tưới màu cam từ ảnh thật)
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.012, 0.055, 12),
    new THREE.MeshStandardMaterial({ color: 0xf97316 })
  );
  nozzle.rotation.x = Math.PI / 4;
  nozzle.position.set(-hx * 0.6, H - 0.08, -hz * 0.6);
  rigGroup.add(nozzle);

  // 3D Water Spray Particle System (Linked to Relay 1: Bơm tưới)
  const sprayCount = 180;
  const sprayGeom = new THREE.BufferGeometry();
  const sprayPositions = new Float32Array(sprayCount * 3);
  const sprayVels = [];
  const nozzleOrigin = new THREE.Vector3(-hx * 0.6, H - 0.08, -hz * 0.6);

  for (let i = 0; i < sprayCount; i++) {
    sprayPositions[i * 3] = nozzleOrigin.x;
    sprayPositions[i * 3 + 1] = nozzleOrigin.y;
    sprayPositions[i * 3 + 2] = nozzleOrigin.z;
    sprayVels.push({
      vx: 0.15 + (Math.random() - 0.5) * 0.35,
      vy: -0.6 - Math.random() * 0.7,
      vz: 0.20 + (Math.random() - 0.5) * 0.35
    });
  }
  sprayGeom.setAttribute('position', new THREE.BufferAttribute(sprayPositions, 3));
  const sprayMat = new THREE.PointsMaterial({
    color: 0x0284c7,
    size: 0.038,
    transparent: true,
    opacity: 0.85
  });
  const sprayPoints = new THREE.Points(sprayGeom, sprayMat);
  sprayPoints.visible = false;
  rigGroup.add(sprayPoints);
  this.threeSpray = sprayPoints;
  this.threeSprayPositions = sprayPositions;
  this.threeSprayVels = sprayVels;
  this.threeNozzleOrigin = nozzleOrigin;

  // Floor Grid
  const gridHelper = new THREE.GridHelper(8, 24, 0x059669, 0xcbe3d5);
  gridHelper.position.y = -0.01;
  scene.add(gridHelper);

  scene.add(rigGroup);
  this.threeScene = scene;
  this.threeCamera = camera;
  this.threeRenderer = renderer;
  this.threeControls = controls;

  // Initial actuator state synchronization
  this.syncThreeActuators();

  window.addEventListener('resize', () => {
    this.resizeThree();
  });
};

VisualTwin.resizeThree = function() {
  const container = document.getElementById('three-container');
  const viewport = document.querySelector('.motion-viewport');
  if (!this.threeRenderer || !this.threeCamera) return;
  const w = (container && container.clientWidth > 0) 
    ? container.clientWidth 
    : ((viewport && viewport.clientWidth > 0) ? viewport.clientWidth : 780);
  const h = (container && container.clientHeight > 0) 
    ? container.clientHeight 
    : ((viewport && viewport.clientHeight > 0) ? viewport.clientHeight : 440);
  if (w > 0 && h > 0) {
    this.threeCamera.aspect = w / h;
    this.threeCamera.updateProjectionMatrix();
    this.threeRenderer.setSize(w, h, false);
  }
};

/* Synchronize 3D Actuator Elements with Relay State */
VisualTwin.syncThreeActuators = function() {
  if (this.threeSpray) {
    this.threeSpray.visible = this.relayState.pump;
  }
  if (this.threeLedLight) {
    this.threeLedLight.intensity = this.relayState.light ? 2.4 : 0.0;
  }
  if (this.threeTubes) {
    this.threeTubes.forEach((t) => {
      t.material.color.setHex(this.relayState.light ? 0xfffbeb : 0x64748b);
    });
  }
};

/* --------------------------------------------------------------------------
   GLOBAL ANIMATION LOOP
   -------------------------------------------------------------------------- */
VisualTwin.startAnimationLoop = function() {
  const loop = (now) => {
    if (this.currentMode === 'motion') {
      this.renderMotionCanvas(now);
    } else if (this.currentMode === 'three') {
      if (this.threeControls) this.threeControls.update();

      // Animate 3D water spray when pump is active
      if (this.relayState.pump && this.threeSpray && this.threeSprayPositions) {
        const pos = this.threeSprayPositions;
        const vels = this.threeSprayVels;
        const o = this.threeNozzleOrigin;

        for (let i = 0; i < vels.length; i++) {
          pos[i * 3] += vels[i].vx * 0.04;
          pos[i * 3 + 1] += vels[i].vy * 0.04;
          pos[i * 3 + 2] += vels[i].vz * 0.04;

          // Reset particle when it reaches soil surface
          if (pos[i * 3 + 1] < 0.38) {
            pos[i * 3] = o.x;
            pos[i * 3 + 1] = o.y;
            pos[i * 3 + 2] = o.z;
          }
        }
        this.threeSpray.geometry.attributes.position.needsUpdate = true;
      }

      if (this.threeRenderer && this.threeScene && this.threeCamera) {
        this.threeRenderer.render(this.threeScene, this.threeCamera);
      }
    }
    this.animFrameId = requestAnimationFrame(loop);
  };
  this.animFrameId = requestAnimationFrame(loop);
};

/* Setup Mode Switcher Buttons */
VisualTwin.setupModeTabs = function() {
  const btns = document.querySelectorAll('.mode-tab-btn');
  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      btns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      this.switchMode(mode);
    });
  });

  const viewBtns = document.querySelectorAll('.view-btn');
  viewBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      viewBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      this.activeView = btn.dataset.view;
    });
  });
};

VisualTwin.switchMode = function(mode) {
  this.currentMode = mode;
  document.querySelectorAll('.view-sublayer').forEach((el) => el.classList.remove('active'));

  const motionLayer = document.getElementById('canvas-motion');
  const threeLayer = document.getElementById('three-container');
  const overlayControls = document.querySelector('.viewport-overlay-controls');

  if (mode === 'motion') {
    if (motionLayer) motionLayer.classList.add('active');
    if (overlayControls) overlayControls.style.display = 'flex';
  } else if (mode === 'three') {
    if (threeLayer) threeLayer.classList.add('active');
    if (overlayControls) overlayControls.style.display = 'none';
    this.resizeThree();
    requestAnimationFrame(() => this.resizeThree());
    setTimeout(() => this.resizeThree(), 50);
    this.syncThreeActuators();
  }
};

/* Hardware Relay Control Toggles (Affects both 2D canvas and 3D mode) */
VisualTwin.togglePump = function() {
  this.relayState.pump = !this.relayState.pump;
  const btn = document.getElementById('btn-relay-pump');
  if (btn) {
    btn.classList.toggle('active', this.relayState.pump);
    btn.textContent = this.relayState.pump ? 'BẬT' : 'TẮT';
  }
  this.syncThreeActuators();
};

VisualTwin.toggleLight = function() {
  this.relayState.light = !this.relayState.light;
  const btn = document.getElementById('btn-relay-light');
  if (btn) {
    btn.classList.toggle('active', this.relayState.light);
    btn.textContent = this.relayState.light ? 'BẬT' : 'TẮT';
  }
  this.syncThreeActuators();
};

window.VisualTwin = VisualTwin;
