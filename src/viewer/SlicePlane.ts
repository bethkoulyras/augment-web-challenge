import {
  Box3,
  BoxGeometry,
  BufferGeometry,
  DoubleSide,
  Group,
  LineDashedMaterial,
  Line,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Plane,
  Raycaster,
  Uniform,
  Vector2,
  Vector3,
} from "three";
import type { MeshLambertMaterial, PerspectiveCamera, Scene } from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import sliceVertexShader from "./shaders/slice.vert.glsl?raw";
import sliceFragmentShader from "./shaders/slice.frag.glsl?raw";

interface SlicePlaneOptions {
  canvas: HTMLCanvasElement;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  scene: Scene;
  material: MeshLambertMaterial;
  bounds: Box3;
  step: number;
  render: () => void;
  onChange: (position: number) => void;
}

export class SlicePlane {
  private readonly options: SlicePlaneOptions;
  private readonly bounds: Box3;
  private readonly group = new Group();
  private readonly geometry = new BoxGeometry(1, 1, 1);
  private readonly material = new MeshBasicMaterial({
    color: "#ff8900",
    side: DoubleSide,
    transparent: true,
    opacity: 0.045,
    depthTest: true,
    depthWrite: true,
  });
  private readonly plane = new Mesh(this.geometry, this.material);
  private readonly edgeMaterial = new LineDashedMaterial({
    dashSize: 2,
    gapSize: 1.5,
    color: "#ff8900",
    transparent: true,
    opacity: 0.8,
    depthTest: this.material.depthTest,
    depthWrite: false,
  });
  private readonly frame = new Line(new BufferGeometry(), this.edgeMaterial);
  private readonly position = new Uniform(0);
  private readonly active = new Uniform(false);
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly dragPlane = new Plane();
  private readonly point = new Vector3();
  private dragPointer: number | null = null;
  private dragOffset = 0;
  private controlsEnabled = true;

  constructor(options: SlicePlaneOptions) {
    this.options = options;
    this.bounds = options.bounds.clone();
    this.plane.renderOrder = 2;
    this.frame.renderOrder = 1;
    this.group.add(this.plane, this.frame);
    this.group.visible = false;
    options.scene.add(this.group);
    this.resizePlane();
    this.moveTo(this.bounds.getCenter(new Vector3()).z);

    options.material.onBeforeCompile = (shader) => {
      shader.uniforms.slicePosition = this.position;
      shader.uniforms.sliceActive = this.active;
      // Extend Three's Lambert shaders so lighting and instancing stay intact.
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
${sliceVertexShader}`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
updateSliceSelection();`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
${sliceFragmentShader}`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
diffuseColor.rgb = applySliceHighlight(diffuseColor.rgb);`,
        );
    };
    options.material.customProgramCacheKey = () => "slice-highlight";
    options.material.needsUpdate = true;

    options.canvas.addEventListener("pointerdown", this.pointerDown, true);
    options.canvas.addEventListener("pointermove", this.pointerMove);
    options.canvas.addEventListener("pointerup", this.pointerUp);
    options.canvas.addEventListener("pointercancel", this.pointerUp);
    options.canvas.addEventListener("lostpointercapture", this.pointerUp);
    window.addEventListener("blur", this.finishDrag);
  }

  public setEnabled(enabled: boolean): void {
    if (!enabled) this.finishDrag();
    this.active.value = enabled;
    this.group.visible = enabled;
    this.options.canvas.style.cursor = "";
    this.options.render();
  }

  public setBounds(bounds: Box3): void {
    this.bounds.copy(bounds);
    this.resizePlane();
    this.moveTo(this.position.value);
  }

  public dispose(): void {
    this.finishDrag();
    const canvas = this.options.canvas;
    canvas.removeEventListener("pointerdown", this.pointerDown, true);
    canvas.removeEventListener("pointermove", this.pointerMove);
    canvas.removeEventListener("pointerup", this.pointerUp);
    canvas.removeEventListener("pointercancel", this.pointerUp);
    canvas.removeEventListener("lostpointercapture", this.pointerUp);
    window.removeEventListener("blur", this.finishDrag);
    canvas.style.cursor = "";
    this.options.scene.remove(this.group);
    this.geometry.dispose();
    this.frame.geometry.dispose();
    this.material.dispose();
    this.edgeMaterial.dispose();
  }

  private resizePlane(): void {
    const size = this.bounds.getSize(new Vector3());
    const centre = this.bounds.getCenter(new Vector3());
    this.group.position.x = centre.x;
    this.group.position.y = centre.y;
    this.plane.scale.set(size.x + 10, size.y + 20, this.options.step);
    const halfWidth = this.plane.scale.x / 2;
    const halfHeight = this.plane.scale.y / 2;
    this.frame.geometry.dispose();
    this.frame.geometry = new BufferGeometry().setFromPoints([
      new Vector3(-halfWidth, -halfHeight, 0),
      new Vector3(halfWidth, -halfHeight, 0),
      new Vector3(halfWidth, halfHeight, 0),
      new Vector3(-halfWidth, halfHeight, 0),
      new Vector3(-halfWidth, -halfHeight, 0),
    ]);
    this.frame.computeLineDistances();
  }

  private moveTo(position: number): void {
    const step = this.options.step;
    this.position.value = MathUtils.clamp(
      Math.round(position / step) * step,
      this.bounds.min.z + step / 2,
      this.bounds.max.z - step / 2,
    );
    this.group.position.z = this.position.value;
    this.options.onChange(this.position.value);
    this.options.render();
  }

  private setRay(event: PointerEvent): boolean {
    const rect = this.options.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.options.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.pointer, this.options.camera);
    return true;
  }

  private readonly pointerDown = (event: PointerEvent): void => {
    if (
      !this.active.value ||
      !event.isPrimary ||
      event.button !== 0 ||
      this.dragPointer !== null
    )
      return;
    if (!this.setRay(event)) return;
    this.group.updateMatrixWorld(true);
    const hit = this.raycaster.intersectObject(this.plane)[0];
    if (!hit) return;
    this.point.copy(hit.point);
    const normal = this.options.camera.position.clone().sub(this.point);
    normal.z = 0;
    if (normal.lengthSq() < 0.000001) return;
    this.dragPlane.setFromNormalAndCoplanarPoint(
      normal.normalize(),
      this.point,
    );
    this.dragOffset = hit.point.z - this.position.value;
    this.dragPointer = event.pointerId;
    this.controlsEnabled = this.options.controls.enabled;
    this.options.controls.enabled = false;
    this.options.canvas.setPointerCapture(event.pointerId);
    this.options.canvas.style.cursor = "grabbing";
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  private readonly pointerMove = (event: PointerEvent): void => {
    if (!this.active.value) return;
    if (!this.setRay(event)) return;
    if (this.dragPointer === event.pointerId) {
      if (this.raycaster.ray.intersectPlane(this.dragPlane, this.point))
        this.moveTo(this.point.z - this.dragOffset);
    } else if (event.buttons === 0) {
      this.options.canvas.style.cursor = this.raycaster.intersectObject(
        this.plane,
      ).length
        ? "grab"
        : "";
    }
  };

  private readonly pointerUp = (event: PointerEvent): void => {
    if (this.dragPointer === event.pointerId) this.finishDrag();
  };

  private readonly finishDrag = (): void => {
    if (this.dragPointer === null) return;
    const id = this.dragPointer;
    this.dragPointer = null;
    if (this.options.canvas.hasPointerCapture(id))
      this.options.canvas.releasePointerCapture(id);
    this.options.canvas.style.cursor = "";
    this.options.controls.enabled = this.controlsEnabled;
  };

}
