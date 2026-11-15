uniform float slicePosition;
uniform bool sliceActive;

varying float sliceSelected;

void updateSliceSelection() {
  float blockCentre = instanceMatrix[3].z;
  float blockHalfDepth = length(instanceMatrix[2].xyz) * 0.5;
  float distanceToSlice = abs(blockCentre - slicePosition);
  bool intersectsSlice = distanceToSlice <= blockHalfDepth + 0.001;

  sliceSelected = sliceActive && intersectsSlice ? 1.0 : 0.0;
}
