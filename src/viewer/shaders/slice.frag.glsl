uniform bool sliceActive;

varying float sliceSelected;

vec3 applySliceHighlight(vec3 colour) {
  if (sliceActive) {
    vec3 highlightColour = vec3(1.0);
    return mix(colour, highlightColour, sliceSelected * 0.55);
  }

  return colour;
}
