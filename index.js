


// Get the DOM element to attach the scene
const container = document.querySelector('#canvas-container');

let clock = new THREE.Clock();

// Create the scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xabcdef);

// Create and position the camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 50, 50);
camera.lookAt(scene.position);

// Create the renderer and attach it to the DOM
//const renderer = new THREE.WebGLRenderer();
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(container.offsetWidth, container.offsetHeight);
container.appendChild(renderer.domElement);

// Improved water material using MeshPhongMaterial
const waterGeometry = new THREE.BoxGeometry(120, 73, 10, 104, 104, 1); // Added depth of 10

const positions = waterGeometry.attributes.position;
const waterMaterial = new THREE.MeshPhongMaterial({
    color: 0x4040ff, // Base color of water
    transparent: true,
    opacity: 0.8,
    shininess: 100,
    reflectivity: 0.5,
    flatShading: true,
});

const water = new THREE.Mesh(waterGeometry, waterMaterial);
water.rotation.x = -Math.PI / 2; // Rotate the box to lie flat
scene.add(water);

// Add a directional light to create highlights and shadows, enhancing the water effect
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128, {
    format: THREE.RGBFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
});

// Create a cube camera
const cubeCamera = new THREE.CubeCamera(1, 1000, cubeRenderTarget);
cubeCamera.position.set(0, 0, 0);
scene.add(cubeCamera);

// Render the scene to the cube map
cubeCamera.update(renderer, scene);



const dropletGeometry = new THREE.SphereGeometry(2, 32, 32);
const dropletMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const droplet = new THREE.Mesh(dropletGeometry, dropletMaterial);
droplet.position.set(0, 20, 0); // Start position of the droplet
scene.add(droplet);

const loader = new THREE.GLTFLoader();
loader.load('./assets/modern_faucet_high_poly.glb', function (gltf) {
    const faucetModel = gltf.scene;
    faucetModel.position.set(-6.4, 35.8, 0); // Adjust position as necessary
    faucetModel.scale.set(90, 145, 90); // Adjust scale as necessary
    faucetModel.rotation.x = Math.PI / 15;
    faucetModel.rotation.y = Math.PI / 7;

    // Traverse the model and update materials
    faucetModel.traverse((child) => {
        if (child.isMesh) {
            // Define a silver-like material
            const silverMaterial = new THREE.MeshStandardMaterial({
                color: 0x808080, // Light gray for a silver look
                metalness: 0.9, // High metalness for a metallic look
                roughness: 0.1, // Low roughness for a shiny surface
                envMap: cubeRenderTarget.texture,
                envMapIntensity: 1.5 // Adjust based on your environment map for reflections
            });

            // Apply the silver material to this part of the model
            child.material = silverMaterial;
        }
    });

    scene.add(faucetModel);
    animate();
}, undefined, function (error) {
    console.error(error);
});

const slider = document.getElementById('Velocity');
const output = document.getElementById('VelocityValue');

const amplitudeSlider = document.getElementById('Amplitude');
const amplitudeOutput = document.getElementById('AmplitudeValue');

//let dropSpeed = 10;
let Velocity = parseFloat(slider.value);
let waveAmplitude = parseFloat(amplitudeSlider.value);

amplitudeSlider.oninput = function () {
    waveAmplitude = parseFloat(this.value);
    amplitudeOutput.innerHTML = this.value;
}

slider.oninput = function () {
    Velocity = parseFloat(this.value);
    output.innerHTML = this.value;
}


const originalHeights = new Float32Array(positions.count);
for (let i = 0; i < positions.count; i++) {
    originalHeights[i] = positions.getY(i);
}


let activeWaves = [];

// Function to create a ripple at a given world position
function createRipple(worldImpactPosition) {
    // Add a new wave object to the active waves array
    activeWaves.push({
        position: water.worldToLocal(worldImpactPosition.clone()),
        radius: 0,
        maxRadius: 100, // maximum radius before the wave fades,
        fade: 1.0,
    });
}

function updateWaves() {
    // Calculate contributions from all waves for each vertex
    for (let i = 0; i < positions.count; i++) {
        let vertexContribution = 0;

        activeWaves.forEach(wave => {
            const x = positions.getX(i);
            const z = positions.getZ(i);
            const dist = Math.sqrt((x - wave.position.x) ** 2 + (z - wave.position.z) ** 2);

            if (dist < wave.radius) {
                const phase = (dist * 0.2 - wave.radius * 0.05);
                // Reduce amplitude as the wave moves out
                const amplitude = (1 - dist / wave.maxRadius) * wave.fade * waveAmplitude;
                const delta = Math.sin(phase) * amplitude;
                vertexContribution += delta;
            }
        });

        // Apply the updated height with damping and clamp to avoid extreme heights
        const maxDeviation = 2; // Maximum allowed deviation from the original height
        const dampedHeight = originalHeights[i] + vertexContribution;
        const clampedHeight = Math.max(originalHeights[i] - maxDeviation, Math.min(dampedHeight, originalHeights[i] + maxDeviation));
        positions.setY(i, clampedHeight);
    }
    positions.needsUpdate = true;

    // Update wave radius, apply damping, and remove waves that have faded away
    activeWaves = activeWaves.map(wave => {
        wave.radius += 0.5; // Increase the radius for the next frame
        if (wave.radius > wave.maxRadius) {
            wave.fade *= 0.98; // Apply damping to the wave's fade value
        }
        return wave;
    }).filter(wave => wave.fade > 0.01); // Remove waves that have almost completely faded
}


function animate() {
    let delta = clock.getDelta();

    // Move the droplet down
    droplet.position.y -= Velocity * delta;

    // When the droplet hits the water surface, create a ripple
    if (droplet.position.y <= 0) { // Check if droplet has hit the water surface
        createRipple(droplet.position.clone());
        droplet.position.y = 20; // Reset to starting height
    }

    // Update waves and render the scene
    updateWaves();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);

}

animate();




