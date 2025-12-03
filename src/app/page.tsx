"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [totalUsers, setTotalUsers] = useState("10000000");
  const [highStart, setHighStart] = useState(17);
  const [highEnd, setHighEnd] = useState(23);
  const [highProb, setHighProb] = useState(60);
  const [lowProb, setLowProb] = useState(20);
  const [deliveryHours, setDeliveryHours] = useState(20);
  const [targetRate, setTargetRate] = useState(99.9);

  const [result, setResult] = useState<{ rate: number; rounds: number; coverage: number }[]>([]);

  // 计算单轮失败概率 q（滑动窗口积分）
  const calculateFailProb = (): number => {
    const pHigh = highProb / 100;
    const pLow = lowProb / 100;
    const windowHours = deliveryHours;
    let totalFail = 0;

    for (let t = 0; t < 24; t += 0.01) {
      let failInWindow = 1.0;
      let remaining = windowHours;
      let currentHour = t % 24;

      while (remaining > 0) {
        let segmentProb: number;
        let segmentLength: number;

        if (currentHour >= highStart && currentHour < highEnd) {
          segmentProb = 1 - pHigh; // 关机概率
          segmentLength = Math.min(remaining, highEnd - currentHour);
        } else {
          segmentProb = 1 - pLow;
          // 计算到下一个高开机点的距离（循环）
          let nextHigh = currentHour < highStart ? highStart : highStart + 24;
          segmentLength = Math.min(remaining, nextHigh - currentHour);
        }

        if (segmentLength > 0) {
          failInWindow *= Math.pow(segmentProb, segmentLength);
          remaining -= segmentLength;
          currentHour += segmentLength;
          if (currentHour >= 24) currentHour -= 24;
        } else {
          break; // 避免无限循环
        }
      }
      totalFail += failInWindow * 0.01;
    }

    return totalFail / 24;
  };

  useEffect(() => {
    const q = calculateFailProb();
    const rates = [90, 95, 99, 99.9, 99.99, 99.999];
    const results = rates.map((rate) => {
      if (q <= 0) return { rate, rounds: 1, coverage: 100 };
      const n = Math.ceil(Math.log(1 - rate / 100) / Math.log(q));
      const coverage = (1 - Math.pow(q, n)) * 100;
      return { rate, rounds: n, coverage: Number(coverage.toFixed(6)) };
    });
    setResult(results);
  }, [highStart, highEnd, highProb, lowProb, deliveryHours]);

  const targetResult = result.find((r) => r.rate === targetRate) || result[3];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">Message Delivery Calculator</h1>
        <p className="text-center text-gray-600 mb-10">Based on time-segmented device-on probabilities, calculate the required number of push rounds</p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* 参数卡片 */}
          <Card>
            <CardHeader>
              <CardTitle>Parameter Settings</CardTitle>
              <CardDescription>Adjust user behavior and strategy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Total Users</Label>
                <Input
                  value={totalUsers}
                  onChange={(e) => setTotalUsers(e.target.value)}
                  placeholder="10000000"
                />
              </div>
              <div>
                <Label>High Device-On Period: {highStart}:00 ~ {highEnd}:00</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label className="text-xs">Start</Label>
                    <Slider value={[highStart]} onValueChange={(v) => setHighStart(v[0])} min={0} max={23} step={1} />
                    <span>{highStart}h</span>
                  </div>
                  <div>
                    <Label className="text-xs">End</Label>
                    <Slider value={[highEnd]} onValueChange={(v) => setHighEnd(v[0])} min={highStart + 1} max={24} step={1} />
                    <span>{highEnd}h</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>High Device-On Probability</Label>
                  <Slider value={[highProb]} onValueChange={(v) => setHighProb(v[0])} min={0} max={100} step={5} />
                  <span className="text-lg font-medium">{highProb}%</span>
                </div>
                <div>
                  <Label>Low Device-On Probability</Label>
                  <Slider value={[lowProb]} onValueChange={(v) => setLowProb(v[0])} min={0} max={100} step={5} />
                  <span className="text-lg font-medium">{lowProb}%</span>
                </div>
              </div>
              <div>
                <Label>Delivery Time per Round (hours)</Label>
                <Slider value={[deliveryHours]} onValueChange={(v) => setDeliveryHours(v[0])} min={1} max={23} step={1} />
                <span className="text-lg font-medium">{deliveryHours} hours</span>
              </div>
              <div>
                <Label>Target Success Rate</Label>
                <Slider value={[targetRate]} onValueChange={(v) => setTargetRate(v[0])} min={90} max={99.999} step={0.1} />
                <span className="text-lg font-bold text-indigo-600">{targetRate}%</span>
              </div>
            </CardContent>
          </Card>

          {/* 结果卡片 */}
          <Card>
            <CardHeader>
              <CardTitle>Calculation Results</CardTitle>
              <CardDescription>{parseInt(totalUsers).toLocaleString()} users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl">
                <p className="text-lg">Achieve {targetRate}% coverage</p>
                <p className="text-5xl font-bold mt-3">Minimum Required</p>
                <p className="text-7xl font-black mt-4">{targetResult?.rounds} rounds</p>
                <p className="mt-4 text-xl opacity-90">Actual: {targetResult?.coverage.toFixed(4)}%</p>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-gray-600 font-medium">Rounds for Each Target:</p>
                {result.map(({ rate, rounds, coverage }) => (
                  <div key={rate} className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={rate >= 99.9 ? "default" : "secondary"}>{rate}%</Badge>
                      <span className="font-medium"> {rounds} rounds</span>
                    </div>
                    <span className="text-sm text-gray-500">≈{coverage}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <p className="text-center text-sm text-gray-500 mt-12">Build by Henry Qian</p>
      </div>
    </div>
  );
}