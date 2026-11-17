// Keyboard and mouse input. Keys are tracked by code so WASD and arrows
// both work; mouse position is stored in canvas pixels for aiming.
export function attachInput(G, canvas) {
  const down = (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) {
      G.keys[e.code] = true;
      G.pressed.add(e.code);
      if (G.sound) G.sound.ensure();
      G.onKey(e.code);
    }
  };
  const up = (e) => { G.keys[e.code] = false; };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => { G.keys = {}; });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    G.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    G.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      G.mouse.down = true;
      if (G.sound) G.sound.ensure();
      G.onMouseDown();
    }
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) G.mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}
