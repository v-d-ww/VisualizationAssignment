import { useEffect, useRef } from "react";
import * as d3 from "d3";
import housePriceData from "../data/housePriceData.json";

interface Scatter3DProps {
  selectedProvinces?: number[];
  currentYear?: string;
  width?: number;
  height?: number;
}

type ProvinceRecord = {
  adcode: number;
  name: string;
  data: Record<
    string,
    {
      average?: number | null;
      [month: string]: number | null | undefined;
    }
  >;
};

const findPrice = (
  data: ProvinceRecord[],
  adcode: number,
  year: string
): number | null => {
  const rec = data.find((p) => p.adcode === adcode);
  if (!rec || !rec.data) return null;
  const y = rec.data[year];
  if (!y) return null;
  return y.average ?? null;
};

function Scatter3D({
  selectedProvinces = [],
  currentYear = "2024",
  width = 400,
  height = 400,
}: Scatter3DProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 50, right: 60, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const data = housePriceData as ProvinceRecord[];
    const provinces = data.filter((p) => p.name && p.adcode !== 100000);
    const years = ["2020", "2021", "2022", "2023", "2024"];

    // 准备3D散点数据（使用2D投影展示3D效果）
    const scatterData: Array<{
      province: string;
      adcode: number;
      year: number;
      price: number;
      gdp: number; // 模拟GDP数据
      x: number;
      y: number;
      size: number;
    }> = [];

    provinces.forEach((province) => {
      years.forEach((year, yearIndex) => {
        const price = findPrice(data, province.adcode, year);
        if (price !== null && price > 0) {
          // 模拟GDP数据（基于房价估算）
          const gdp = price * 50 + Math.random() * 10000;
          scatterData.push({
            province: province.name,
            adcode: province.adcode,
            year: parseInt(year),
            price,
            gdp,
            x: 0, // 将在后面计算
            y: 0, // 将在后面计算
            size: Math.max(4, Math.min(12, price / 2000)),
          });
        }
      });
    });

    if (scatterData.length === 0) {
      g.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#94a3b8")
        .text("暂无数据");
      return;
    }

    // 创建比例尺
    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(scatterData, (d) => d.year) as [number, number])
      .nice()
      .range([0, chartWidth]);

    const yScale = d3
      .scaleLinear()
      .domain(d3.extent(scatterData, (d) => d.gdp) as [number, number])
      .nice()
      .range([chartHeight, 0]);

    const colorScale = d3
      .scaleSequential(d3.interpolateViridis)
      .domain(d3.extent(scatterData, (d) => d.price) as [number, number]);

    // 计算3D投影（使用等轴测投影）
    scatterData.forEach((d) => {
      const x = xScale(d.year);
      const y = yScale(d.gdp);
      // 添加价格维度的投影偏移（模拟Z轴）
      const zOffset = ((d.price - d3.min(scatterData, (dd) => dd.price)!) / 
        (d3.max(scatterData, (dd) => dd.price)! - d3.min(scatterData, (dd) => dd.price)!)) * 30;
      d.x = x + zOffset * 0.5;
      d.y = y - zOffset * 0.5;
    });

    // 绘制网格线
    g.selectAll(".grid-line")
      .data(xScale.ticks(5))
      .enter()
      .append("line")
      .attr("class", "grid-line")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", 0)
      .attr("y2", chartHeight)
      .attr("stroke", "rgba(255,255,255,0.05)")
      .attr("stroke-width", 1);

    g.selectAll(".grid-line-y")
      .data(yScale.ticks(5))
      .enter()
      .append("line")
      .attr("class", "grid-line-y")
      .attr("x1", 0)
      .attr("x2", chartWidth)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", "rgba(255,255,255,0.05)")
      .attr("stroke-width", 1);

    // 绘制坐标轴
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format(".0f"));
    const yAxis = d3.axisLeft(yScale).tickFormat(d3.format(".0f"));

    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill", "#94a3b8")
      .attr("font-size", 11);

    g.append("g")
      .attr("class", "y-axis")
      .call(yAxis)
      .selectAll("text")
      .attr("fill", "#94a3b8")
      .attr("font-size", 11);

    // 坐标轴标签
    g.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", chartHeight + 45)
      .attr("text-anchor", "middle")
      .attr("fill", "#94a3b8")
      .attr("font-size", 12)
      .text("年份");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -chartHeight / 2)
      .attr("y", -45)
      .attr("text-anchor", "middle")
      .attr("fill", "#94a3b8")
      .attr("font-size", 12)
      .text("GDP (亿元)");

    // 绘制散点
    const points = g
      .selectAll(".point")
      .data(scatterData)
      .enter()
      .append("circle")
      .attr("class", "point")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => d.size)
      .attr("fill", (d) => {
        const isSelected = selectedProvinces.includes(d.adcode);
        return isSelected ? colorScale(d.price) : "rgba(100,116,139,0.3)";
      })
      .attr("opacity", (d) => (selectedProvinces.includes(d.adcode) ? 1 : 0.3))
      .attr("stroke", (d) => (selectedProvinces.includes(d.adcode) ? "#fff" : "none"))
      .attr("stroke-width", 1)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("r", d.size + 2).attr("opacity", 1);
        // 显示tooltip
        const tooltip = g
          .append("g")
          .attr("class", "tooltip")
          .attr("transform", `translate(${d.x + 10},${d.y - 10})`);

        tooltip
          .append("rect")
          .attr("x", -70)
          .attr("y", -40)
          .attr("width", 140)
          .attr("height", 60)
          .attr("fill", "rgba(0,0,0,0.8)")
          .attr("rx", 4);

        tooltip
          .append("text")
          .attr("x", 0)
          .attr("y", -20)
          .attr("text-anchor", "middle")
          .attr("fill", "#e2e8f0")
          .attr("font-size", 11)
          .text(d.province);

        tooltip
          .append("text")
          .attr("x", 0)
          .attr("y", -5)
          .attr("text-anchor", "middle")
          .attr("fill", "#94a3b8")
          .attr("font-size", 10)
          .text(`${d.year}年`);

        tooltip
          .append("text")
          .attr("x", 0)
          .attr("y", 10)
          .attr("text-anchor", "middle")
          .attr("fill", "#94a3b8")
          .attr("font-size", 10)
          .text(`房价: ${d.price.toFixed(0)}元/㎡`);

        tooltip
          .append("text")
          .attr("x", 0)
          .attr("y", 25)
          .attr("text-anchor", "middle")
          .attr("fill", "#94a3b8")
          .attr("font-size", 10)
          .text(`GDP: ${(d.gdp / 10000).toFixed(1)}万亿`);
      })
      .on("mouseout", function (event, d) {
        d3.select(this).attr("r", d.size).attr("opacity", (d: any) => (selectedProvinces.includes(d.adcode) ? 1 : 0.3));
        g.selectAll(".tooltip").remove();
      });

    // 标题
    g.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .attr("font-size", 14)
      .attr("font-weight", 600)
      .text(selectedProvinces.length > 0 
        ? `3D散点图 - 年份×GDP×房价 (${selectedProvinces.length}个省份)`
        : "3D散点图 - 年份×GDP×房价");
  }, [selectedProvinces, currentYear, width, height]);

  return (
    <div
      style={{
        width: width,
        height: height,
        background: "rgba(255,255,255,0.02)",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export default Scatter3D;
