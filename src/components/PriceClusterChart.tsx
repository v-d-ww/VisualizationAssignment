import { useEffect, useRef } from "react";
import * as d3 from "d3";
import housePriceData from "../data/housePriceData.json";

interface PriceClusterChartProps {
  selectedProvinces?: number[];
  currentYear?: string;
  width?: number;
  height?: number;
}

type ProvinceData = {
  adcode: number;
  name: string;
  data: {
    [year: string]: {
      average: number;
    };
  };
};

function PriceClusterChart({
  selectedProvinces = [],
  currentYear = "2024",
  width = 400,
  height = 400,
}: PriceClusterChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const data = housePriceData as ProvinceData[];
    const provinces = data.filter((item) => item.adcode !== 100000);
    const years = ["2020", "2021", "2022", "2023", "2024"];

    // 计算每个省份的增长特征
    const features: Array<{
      name: string;
      adcode: number;
      growthRate: number;
      avgPrice: number;
      prices: number[];
    }> = [];

    provinces.forEach((province) => {
      const prices: number[] = [];
      years.forEach((year) => {
        const avgPrice = province.data[year]?.average;
        if (avgPrice !== undefined && avgPrice !== null) {
          prices.push(avgPrice);
        }
      });

      if (prices.length >= 2) {
        const startPrice = prices[0];
        const endPrice = prices[prices.length - 1];
        const totalGrowthRate = ((endPrice - startPrice) / startPrice) * 100;
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

        features.push({
          name: province.name,
          adcode: province.adcode,
          growthRate: totalGrowthRate,
          avgPrice: avgPrice,
          prices,
        });
      }
    });

    if (features.length === 0) {
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
      .domain(d3.extent(features, (d) => d.growthRate) as [number, number])
      .nice()
      .range([0, chartWidth]);

    const yScale = d3
      .scaleLinear()
      .domain(d3.extent(features, (d) => d.avgPrice) as [number, number])
      .nice()
      .range([chartHeight, 0]);

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
    const xAxis = d3.axisBottom(xScale).tickSize(-chartHeight).tickFormat(d3.format(".0f"));
    const yAxis = d3.axisLeft(yScale).tickSize(-chartWidth).tickFormat(d3.format(".0f"));

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
      .text("总增长率 (%)");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -chartHeight / 2)
      .attr("y", -45)
      .attr("text-anchor", "middle")
      .attr("fill", "#94a3b8")
      .attr("font-size", 12)
      .text("平均价格 (元/㎡)");

    // 绘制散点
    const points = g
      .selectAll(".point")
      .data(features)
      .enter()
      .append("circle")
      .attr("class", "point")
      .attr("cx", (d) => xScale(d.growthRate))
      .attr("cy", (d) => yScale(d.avgPrice))
      .attr("r", (d) => Math.max(4, Math.min(12, d.avgPrice / 2000)))
      .attr("fill", (d) => (selectedProvinces.includes(d.adcode) ? "#3b82f6" : "#64748b"))
      .attr("opacity", (d) => (selectedProvinces.includes(d.adcode) ? 1 : 0.4))
      .attr("stroke", (d) => (selectedProvinces.includes(d.adcode) ? "#fff" : "none"))
      .attr("stroke-width", (d) => (selectedProvinces.includes(d.adcode) ? 2 : 0))
      .attr("stroke-width", 2)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("r", 8).attr("opacity", 1);
        // 显示tooltip
        const tooltip = g
          .append("g")
          .attr("class", "tooltip")
          .attr("transform", `translate(${xScale(d.growthRate) + 10},${yScale(d.avgPrice) - 10})`);

        tooltip
          .append("rect")
          .attr("x", -60)
          .attr("y", -30)
          .attr("width", 120)
          .attr("height", 50)
          .attr("fill", "rgba(0,0,0,0.8)")
          .attr("rx", 4);

        tooltip
          .append("text")
          .attr("x", 0)
          .attr("y", -10)
          .attr("text-anchor", "middle")
          .attr("fill", "#e2e8f0")
          .attr("font-size", 11)
          .text(d.name);

        tooltip
          .append("text")
          .attr("x", 0)
          .attr("y", 5)
          .attr("text-anchor", "middle")
          .attr("fill", "#94a3b8")
          .attr("font-size", 10)
          .text(`增长率: ${d.growthRate.toFixed(2)}%`);

        tooltip
          .append("text")
          .attr("x", 0)
          .attr("y", 18)
          .attr("text-anchor", "middle")
          .attr("fill", "#94a3b8")
          .attr("font-size", 10)
          .text(`均价: ${d.avgPrice.toFixed(0)}元/㎡`);
      })
      .on("mouseout", function () {
        d3.select(this).attr("r", (d: any) => Math.max(4, Math.min(12, d.avgPrice / 2000))).attr("opacity", (d: any) => (selectedProvinces.includes(d.adcode) ? 1 : 0.4));
        g.selectAll(".tooltip").remove();
      });

    // 标题
    g.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", -15)
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .attr("font-size", 14)
      .attr("font-weight", 600)
      .text(selectedProvinces.length > 0 
        ? `省份房价增长模式分析 (已选中${selectedProvinces.length}个)`
        : "省份房价增长模式分析");
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

export default PriceClusterChart;
