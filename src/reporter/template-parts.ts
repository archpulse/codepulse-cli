export const getCss = () => `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0F172A; --surface: #1E293B; --border: #334155;
    --text: #E2E8F0; --muted: #94A3B8; --accent: #6366F1;
    --green: #10B981; --yellow: #F59E0B; --red: #EF4444;
  }
  body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; }
  header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 24px 40px; display: flex; align-items: center; gap: 16px; }
  header h1 { font-size: 26px; font-weight: 700; color: white; }
  header h1 span { color: var(--accent); }
  .tag { background: #312E81; color: #A5B4FC; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-family: monospace; }
  .container { max-width: 1300px; margin: 0 auto; padding: 32px 40px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 40px; }
  .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
  .stat-card .label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .stat-card .value { font-size: 36px; font-weight: 700; color: white; }
  .stat-card .sub { font-size: 12px; color: var(--muted); margin-top: 4px; }
  .section { margin-bottom: 40px; }
  .section h2 { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: white; display: flex; align-items: center; gap: 10px; }
  .section h2 .icon { width: 8px; height: 22px; background: var(--accent); border-radius: 4px; display: inline-block; }
  table { width: 100%; border-collapse: collapse; background: var(--surface); border-radius: 12px; overflow: hidden; }
  th { background: #162032; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border); }
  td { padding: 10px 16px; border-bottom: 1px solid #1E293B; font-size: 14px; color: var(--text); }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #162032; }
  .td-path { font-family: monospace; font-size: 13px; color: #93C5FD; }
  code { background: #1E293B; color: #F472B6; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
  .badge { padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-left: 6px; }
  .badge-red { background: #450A0A; color: var(--red); }
  .badge-yellow { background: #451A03; color: var(--yellow); }
  .badge-green { background: #052E16; color: var(--green); }
  .graph-container { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; position: relative; }
  .graph-container svg { display: block; width: 100%; height: 100%; }
  .empty { color: var(--muted); font-size: 14px; padding: 24px 16px; }
  .footer { text-align: center; padding: 32px; color: var(--muted); font-size: 13px; border-top: 1px solid var(--border); margin-top: 40px; }
  .pulse { display: inline-block; width: 10px; height: 10px; background: var(--green); border-radius: 50%; margin-right: 8px; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
  .tooltip {
    display: none;
    position: absolute;
    background: #1E293B;
    border: 1px solid var(--border);
    padding: 12px;
    border-radius: 8px;
    font-size: 13px;
    color: var(--text);
    z-index: 100;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.4);
    pointer-events: none;
    width: 280px;
    line-height: 1.5;
    text-transform: none;
    letter-spacing: normal;
    font-weight: 400;
  }
  .tooltip strong { display: block; color: white; margin-bottom: 4px; }
  .tooltip-fix { color: var(--green); display: block; margin-top: 8px; font-weight: 600; }
  
  .info-icon, .section-info {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: help;
    color: var(--muted);
    transition: color 0.15s;
  }
  .info-icon:hover, .section-info:hover { color: var(--accent); }
  .info-icon:hover .tooltip, .section-info:hover .tooltip { display: block; }

  .info-icon { margin-left: 6px; font-size: 14px; }
  .section-info {
    border: 1px solid var(--border);
    border-radius: 50%;
    width: 18px;
    height: 18px;
    font-size: 11px;
    font-weight: 700;
    margin-left: 8px;
  }
  
  .section-info .tooltip { left: 24px; top: -10px; }
  .info-icon .tooltip { right: 24px; top: -10px; }
`;

export const getScripts = (treemapData: any, graphData: any) => `
<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
  (function() {
    try {
      const data = {
        name: "root",
        children: ${JSON.stringify(treemapData)}
      };
      const container = document.getElementById('treemap-container');
      if (!container) return;
      const width = container.clientWidth || 1200;
      const height = 500;
      
      const treemap = d3.treemap().size([width, height]).padding(2).round(true);
      const root = d3.hierarchy(data).sum(d => d.value).sort((a, b) => b.value - a.value);
      treemap(root);
      
      const svg = d3.select("#treemap-container").append("svg")
        .attr("viewBox", \`0 0 \${width} \${height}\`)
        .attr("width", "100%")
        .attr("height", "100%")
        .style("display", "block");
        
      const cell = svg.selectAll("g")
        .data(root.leaves())
        .enter().append("g")
        .attr("transform", d => \`translate(\${d.x0},\${d.y0})\`);
        
      const colorScale = d3.scaleSequential().domain([0, 30]).interpolator(d3.interpolateRgb("#6366F1", "#EF4444"));
      
      cell.append("rect")
        .attr("width", d => Math.max(0, d.x1 - d.x0))
        .attr("height", d => Math.max(0, d.y1 - d.y0))
        .attr("fill", d => d.data.isGod ? "#F59E0B" : colorScale(d.data.complexity))
        .attr("fill-opacity", 0.8)
        .attr("stroke", "#0F172A")
        .attr("stroke-width", 1);
        
      cell.append("text").selectAll("tspan")
        .data(d => {
          const name = d.data.name.split('/').pop();
          return (d.x1 - d.x0 > 50 && d.y1 - d.y0 > 25) ? [name] : [];
        })
        .enter().append("tspan")
        .attr("x", 4).attr("y", 14).attr("fill", "white").attr("font-size", "10px").text(d => d);
        
      cell.append("title").text(d => \`\${d.data.name}\\nLines: \${d.data.value}\\nComplexity: \${d.data.complexity}\\nChurn: \${d.data.churn}\`);
    } catch (e) { console.error("Treemap error:", e); }
  })();

  (function() {
    try {
      const data = ${JSON.stringify(graphData)};
      const container = document.getElementById('graph-container');
      if (!container) return;
      const width = container.clientWidth || 1200;
      const height = 600;
      
      const svg = d3.select("#graph-container").append("svg")
        .attr("viewBox", \`0 0 \${width} \${height}\`)
        .attr("width", "100%")
        .attr("height", "100%")
        .style("display", "block")
        .call(d3.zoom().scaleExtent([0.1, 8]).on("zoom", (event) => g.attr("transform", event.transform)));
        
      const g = svg.append("g");
      
      const simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2));
        
      const link = g.append("g")
        .attr("stroke", "#4F46E5")
        .attr("stroke-opacity", 0.4)
        .selectAll("line")
        .data(data.links)
        .join("line");
        
      const node = g.append("g")
        .selectAll("g")
        .data(data.nodes)
        .join("g")
        .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));
          
      node.append("circle")
        .attr("r", d => d.isCritical ? 10 : 6)
        .attr("fill", d => d.isCritical ? "#EF4444" : d.isGod ? "#F59E0B" : "#6366F1")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);
        
      node.append("text")
        .attr("x", 12)
        .attr("y", 4)
        .text(d => d.name)
        .attr("font-size", "10px")
        .attr("fill", "#94A3B8")
        .style("pointer-events", "none");
        
      node.append("title").text(d => \`\${d.fullPath}\\nComplexity: \${d.complexity}\`);
      
      simulation.on("tick", () => {
        link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
        node.attr("transform", d => \`translate(\${d.x},\${d.y})\`);
      });
      
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
    } catch (e) { console.error("Graph error:", e); }
  })();
</script>
`;
