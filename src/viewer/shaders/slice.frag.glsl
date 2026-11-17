uniform bool sliceActive;
uniform bool inspectActive;

varying float sliceSelected;

vec3 applySliceHighlight(vec3 colour) {
  if (sliceActive) {
    vec3 highlightColour = vec3(1.0, 0.25, 0.0);
    return mix(colour, highlightColour, sliceSelected);
  }

  if (inspectActive) {
    return colour * mix(0.2, 1.0, sliceSelected);
  }

  return colour;
}
