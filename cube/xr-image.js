// <!-- xr-image.js -->
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton";

const imagesArray = [
  { id: "carpet", src: "/images/carpet.png", alt: "Carpet" },
  { id: "carpet1", src: "/images/carpet1.png", alt: "Carpet1" },
  { id: "carpet4", src: "/images/carpet2.jpg", alt: "Carpet4" },
  { id: "carpet5", src: "/images/carpet3.jpg", alt: "Carpet5" },
  { id: "carpet6", src: "/images/carpet4.jpg", alt: "Carpet6" },
  { id: "carpet7", src: "/images/carpet5.jpg", alt: "Carpet7" },
];

const imageRow = document.getElementById("image-row");
for (let i = 0; i < 10; i++) {
 imagesArray.forEach((imageData) => {
   const { src, alt, id } = imageData; // استخدام id بدلاً من id
   const colDiv = document.createElement("div");
   colDiv.className = "col-lg-2 mb12";
   const imgElement = document.createElement("img");
   imgElement.id = id; // استخدام id كـ id
   imgElement.onclick = onSelect;
   imgElement.src = src;
   imgElement.alt = alt;
   colDiv.appendChild(imgElement);
   imageRow.appendChild(colDiv);
 });
}
function createImagePlane(texture) {
  const geometry = new THREE.PlaneGeometry(1, 1); // زيادة حجم الصورة هنا
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
  });
  const imagePlane = new THREE.Mesh(geometry, material);
  return imagePlane;
}

let loadedImages = {};
let hitTestSource = null;
let hitTestSourceRequested = false;
let overlayContent = document.getElementById("overlay-content");
let selectedImage = null;


function onSelect(event) {
  const selectedId = event.target.id; // الحصول على id من الصورة المحددة
  console.log("Before selecting image - Current imageName:", selectedId);

  if (selectedId && reticle.visible) {
    console.log("Image id and reticle visible:", selectedId);
    if (loadedImages[selectedId]) {
      const existingImage = scene.getObjectByName(selectedId);
      console.log("Existing image:", existingImage);
      if (!existingImage) {
        const image = createImagePlane(loadedImages[selectedId]);
        image.name = selectedId;
        scene.add(image);
        selectedImage = image;
        console.log("Selected image:", selectedImage);
        overlayContent.innerText = `Image Coordinates: x=${image.position.x.toFixed(
          2
        )}, y=${image.position.y.toFixed(2)}, z=${image.position.z.toFixed(2)}`;
      }
    }
  }
  console.log("After selecting image - Current imageName:", selectedId);
}
window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(window.devicePixelRatio);
});

const imageLoader = new THREE.TextureLoader();

// Load images
imagesArray.forEach((imageData) => {
  const { src, id } = imageData;
  imageLoader.load(src, (texture) => onLoad(texture, id));
});

function onLoad(texture, name) {
  loadedImages[name] = texture;
}

const scene = new THREE.Scene();

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const light = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(light);

let reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0xffffff * Math.random() })
);
reticle.visible = false;
reticle.matrixAutoUpdate = false;
scene.add(reticle);

const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  1000
);
camera.position.set(0, 2, 5);
camera.lookAt(new THREE.Vector3(0, 0, 0));
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);
document.body.appendChild(
  ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
);

let controller = renderer.xr.getController(0);
controller.addEventListener("selectstart", onSelect);
scene.add(controller);

let pinchStartDistance = 0;
let isPinching = false;
let previousTouch = null;

function handleTouchMove(event) {
  const touches = event.touches;

  if (touches.length === 1) {
    const currentTouch = touches[0];

    if (previousTouch) {
      const deltaX = currentTouch.clientX - previousTouch.clientX;
      const deltaY = currentTouch.clientY - previousTouch.clientY;

      const rotationFactor = 0.01;
      selectedImage.rotation.y += deltaX * rotationFactor;
      selectedImage.rotation.x += deltaY * rotationFactor;
    }

    previousTouch = {
      clientX: currentTouch.clientX,
      clientY: currentTouch.clientY,
    };
  } else if (touches.length === 2) {
    const pinchDistance = Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );

    if (!isPinching) {
      pinchStartDistance = pinchDistance;
      isPinching = true;
    }

    const zoomFactor = pinchDistance / pinchStartDistance;

    if (selectedImage) {
      selectedImage.scale.multiplyScalar(zoomFactor);

      overlayContent.innerText = `Image Coordinates: x=${selectedImage.position.x.toFixed(2)}, y=${selectedImage.position.y.toFixed(2)}, z=${selectedImage.position.z.toFixed(2)}\nScale: ${selectedImage.scale.x.toFixed(2)}`;
    }

    pinchStartDistance = pinchDistance;
  } else {
    previousTouch = null;
    isPinching = false;
    pinchStartDistance = 0;
  }
}

function handleTouchEnd() {
  pinchStartDistance = 0;
  isPinching = false;
  previousTouch = null;
}

window.addEventListener("touchmove", handleTouchMove);
window.addEventListener("touchend", handleTouchEnd);

renderer.setAnimationLoop(render);

function render(timestamp, frame) {
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();

    if (hitTestSourceRequested === false) {
      session.requestReferenceSpace("viewer").then((referenceSpace) => {
        session
          .requestHitTestSource({ space: referenceSpace })
          .then((source) => (hitTestSource = source));
      });

      hitTestSourceRequested = true;

      session.addEventListener("end", () => {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });
    }

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        reticle.visible = true;
        reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);

        if (selectedImage) {
          reticle.visible = false;
        }
      } else {
        reticle.visible = false;
      }
    }
  }
  renderer.render(scene, camera);
}
