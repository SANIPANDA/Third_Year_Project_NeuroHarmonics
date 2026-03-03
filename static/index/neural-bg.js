/* ================= BASIC SETUP ================= */
const canvas = document.getElementById("neural-bg");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

/* ================= CURSOR ================= */
const cursor = { x: null, y: null };

window.addEventListener("mousemove", e => {
  cursor.x = e.clientX;
  cursor.y = e.clientY;
});

window.addEventListener("mouseleave", () => {
  cursor.x = null;
  cursor.y = null;
});

/* ================= NODE ================= */
class Node {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.alpha = 1;
    this.fading = false;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
    if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

    if (this.fading) this.alpha -= 0.015;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(150,120,255,${this.alpha})`;
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#c77dff";
    ctx.fill();
  }
}

/* ================= SYSTEM ================= */
const nodes = [];
const MAX_NODES = 80;

/* Initialize with 80 nodes */
for (let i = 0; i < MAX_NODES; i++) {
  nodes.push(
    new Node(
      Math.random() * canvas.width,
      Math.random() * canvas.height
    )
  );
}

/* ================= CLICK → SPAWN ================= */
/* Using window so UI stays clickable */
window.addEventListener("click", e => {
  nodes.push(new Node(e.clientX, e.clientY));

  if (nodes.length > MAX_NODES) {
    const overflow = nodes.length - MAX_NODES;
    for (let i = 0; i < overflow; i++) {
      nodes[i].fading = true;
    }
  }
});

/* ================= CONNECTIONS ================= */
function drawConnections() {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.hypot(dx, dy);

      if (dist < 160) {
        const alpha =
          (1 - dist / 160) *
          Math.min(nodes[i].alpha, nodes[j].alpha);

        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.strokeStyle = `rgba(199,125,255,${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  /* Cursor as virtual node */
  if (cursor.x !== null) {
    nodes.forEach(node => {
      const dx = node.x - cursor.x;
      const dy = node.y - cursor.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 200) {
        const alpha = (1 - dist / 200) * node.alpha;

        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(cursor.x, cursor.y);
        ctx.strokeStyle = `rgba(139,233,253,${alpha})`;
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }
    });
  }
}

/* ================= CLEANUP ================= */
function cleanup() {
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i].alpha <= 0) nodes.splice(i, 1);
  }
}

/* ================= ANIMATION LOOP ================= */
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawConnections();
  nodes.forEach(node => {
    node.update();
    node.draw();
  });
  cleanup();
  requestAnimationFrame(animate);
}

animate();
