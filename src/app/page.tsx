// src/app/page.tsx   ← 直接完整替换这个文件即可
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [totalUsers, setTotalUsers] = useState("10000000");

  // 高峰时段（最多支持3个，第三个留空即可）
  const [periods, setPeriods] = useState([
    { start: 17, end: 23, prob: 60 },   // 晚上高峰
    { start: 0, end: 0, prob: 0 },      // 备用时段（关闭）
    { start: 0, end: 0, prob: 0 },      // 备用时段（关闭）
  ]);

  const [deliveryHours, setDeliveryHours] = useState(20);
  const [targetRate, setTargetRate] = useState(99.9);

  const [results, setResults] = useState<{ rate: number; rounds: number; coverage: number }[]>([]);

  // 正确计算单轮成功概率：一天24小时平均开机率
  const calculateSuccessRate = () => {
    // 先把高峰期涂上颜色
    const hourlyRate = new Array(24).fill(0.20); // 默认低谷 20%

    periods.forEach(p => {
      if (p.prob === 0 || p.start >= p.end) return;
      const rate = p.prob / 100;
      for (let h = p.start; h < p.end; h++) {
        hourlyRate[h] = rate;
      }
    });

    // 计算一天平均开机概率
    const avg = hourlyRate.reduce((a, b) => a + b, 0) / 24;
    return avg;
  };

  useEffect(() => {
    const p = calculateSuccessRate();
    const q = 1 - p;

    const targets = [90, 95, 99, 99.9, 99.99, 99.999];
    const list = targets.map(rate => {
      if (p >= 1) return { rate, rounds: 1, coverage: 100 };
      if (p <= 0) return { rate, rounds: Infinity, coverage: 0 };

      const n = Math.ceil(Math.log(1 - rate / 100) / Math.log(q));
      const realCoverage = (1 - Math.pow(q, n)) * 100;

      return {
        rate,
        rounds: n,
        coverage: +realCoverage.toFixed(6)
      };
    });

    setResults(list);
  }, [periods, deliveryHours]);

  const currentP = calculateSuccessRate();
  const targetResult = results.find(r => Math.abs(r.rate - targetRate) < 0.1) || results[3];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-black text-center mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-600">
          EMM Delivery Hit Rate Calculator
        </h1>
        <div className="grid lg:grid-cols-2 gap-10">
          {/* 左侧 参数 */}
          <Card className="shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">Parameter Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">

              <div>
                <Label className="text-base">Total Users</Label>
                <Input
                  value={totalUsers}
                  onChange={e => setTotalUsers(e.target.value)}
                  className="text-2xl font-bold mt-2"
                />
              </div>

              <div>
                <Label className="text-base">Delivery Time per Round (hours)</Label>
                <Slider
                  value={[deliveryHours]}
                  onValueChange={v => setDeliveryHours(v[0])}
                  min={1} max={48} step={1}
                  className="mt-4"
                />
                <div className="text-center text-3xl font-bold text-indigo-600 mt-3">
                  {deliveryHours} hours/round
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t">
                <h3 className="font-bold text-xl -mb-2">Peak Online Periods (up to 3)</h3>

                {[0, 1, 2].map(i => (
                  <div key={i} className={`p-5 rounded-xl border ${periods[i].prob > 0 ? "bg-indigo-50 border-indigo-300" : "bg-gray-50"}`}>
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-semibold">Period {i + 1}</span>
                      <Badge variant={periods[i].prob > 0 ? "default" : "secondary"}>
                        {periods[i].prob > 0 ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Start</Label>
                        <Slider
                          value={[periods[i].start]}
                          onValueChange={v => {
                            const newP = [...periods];
                            newP[i].start = v[0];
                            if (v[0] >= newP[i].end) newP[i].end = v[0] + 1;
                            setPeriods(newP);
                          }}
                          min={0} max={23}
                        />
                        <div className="text-center font-medium">{periods[i].start}:00</div>
                      </div>
                      <div>
                        <Label>End</Label>
                        <Slider
                          value={[periods[i].end]}
                          onValueChange={v => {
                            const newP = [...periods];
                            newP[i].end = v[0];
                            setPeriods(newP);
                          }}
                          min={periods[i].start + 1} max={24}
                        />
                        <div className="text-center font-medium">
                          {periods[i].end === 24 ? "24" : periods[i].end}:00
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label>Online Probability</Label>
                      <Slider
                        value={[periods[i].prob]}
                        onValueChange={v => {
                          const newP = [...periods];
                          newP[i].prob = v[0];
                          setPeriods(newP);
                        }}
                        min={0} max={100} step={5}
                      />
                      <div className="text-right text-2xl font-bold text-green-600">
                        {periods[i].prob}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t">
                <Label className="text-lg">Target Coverage Rate</Label>
                <Slider
                  value={[targetRate]}
                  onValueChange={v => setTargetRate(v[0])}
                  min={90} max={99.999} step={0.1}
                  className="mt-4"
                />
                <div className="text-center text-5xl font-black text-purple-600 mt-6">
                  {targetRate.toFixed(3)}%
                </div>
              </div>

            </CardContent>
          </Card>

          {/* 右侧 结果 */}
          <div className="space-y-8">
            <Card className="shadow-2xl">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-3xl">Current Calculation Results</CardTitle>
                <div className="text-lg text-gray-600 mt-2">
                  Single Round Success Rate: <span className="text-4xl font-bold text-indigo-600">
                    {(currentP * 100).toFixed(2)}%
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white -m-6 mb-6">
                  <p className="text-2xl">To reach {targetRate}% coverage, it takes</p>
                  <p className="text-9xl font-black my-8 drop-shadow-2xl">
                    {targetResult?.rounds ?? "?"} <span className="text-5xl">rounds</span>
                  </p>
                  <p className="text-2xl opacity-90">
                    Actual coverage: {targetResult?.coverage.toFixed(4)}%
                  </p>
                </div>

                <div className="space-y-4 mt-8">
                  <h3 className="font-bold text-xl text-center">Coverage Rate Comparison Table</h3>
                  {results.map(({ rate, rounds, coverage }) => (
                    <div
                      key={rate}
                      className={`flex justify-between items-center p-5 rounded-xl border-2 transition-all ${
                        Math.abs(rate - targetRate) < 0.2
                          ? "bg-gradient-to-r from-indigo-100 to-purple-100 border-purple-500 shadow-xl scale-105"
                          : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Badge className="text-lg px-4 py-2" variant={rate >= 99.9 ? "default" : "secondary"}>
                          {rate}%
                        </Badge>
                        <span className="text-xl font-bold">Needs {rounds} rounds</span>
                      </div>
                      <span className="font-medium text-gray-600">≈ {coverage}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <footer className="text-center text-gray-500 mt-20">
          Protyped by Henry Qian on Nov 2025
        </footer>
      </div>
    </div>
  );
}
