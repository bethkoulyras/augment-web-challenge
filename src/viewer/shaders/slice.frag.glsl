varying float sliceSelected;

vec3 applySliceHighlight(vec3 colour) {
  vec3 highlightColour = vec3(1.0, 0.25, 0.0);

  return mix(colour, highlightColour, sliceSelected);
}
