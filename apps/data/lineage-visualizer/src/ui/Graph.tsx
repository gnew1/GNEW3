
import { useEffect, useRef } from "react";
import * as d3 from "d3";

export function Graph({ data, onSelect }: { data: {nodes:any[], links:any[]}, onSelect:(d:any)=>void }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = ref.current.clientWidth;
    const height = ref.current.clientHeight;

    const sim = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id((d:any)=>d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width/2, height/2));

    const link = svg.append("g").attr("stroke","#777").selectAll("line")
      .data(data.links).enter().append("line").attr("stroke-width",1.5);

    const node = svg.append("g").selectAll("circle")
      .data(data.nodes).enter().append("circle")
      .attr("r", 14).attr("fill","#4ade80").attr("stroke","#111")
      .on("click", (_e,d)=> onSelect(d));

    const label = svg.append("g").selectAll("text")
      .data(data.nodes).enter().append("text")
      .text((d:any)=>d.name).attr("font-size",12).attr("fill","#fff");

    sim.on("tick", () => {
      link.attr("x1",(d:any)=>d.source.x).attr("y1",(d:any)=>d.source.y)
          .attr("x2",(d:any)=>d.target.x).attr("y2",(d:any)=>d.target.y);
      node.attr("cx",(d:any)=>d.x).attr("cy",(d:any)=>d.y);
      label.attr("x",(d:any)=>d.x+16).attr("y",(d:any)=>d.y+4);
    });
  }, [data, onSelect]);

  return <svg ref={ref} className="w-full h-full"></svg>
}


