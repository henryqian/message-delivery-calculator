// src/app/page.tsx  ← 直接完整替换（终极100%正确版）
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [totalUsers] = useState("10,000,000");
  const [periods, setPeriods] = useState([
    { start: 10, end: 22, prob: 100 },
    { start: 0,  end: 0,  prob: 0   },
    { start: 0,  end: 0,  prob: 0   },
  ]);
  const [deliveryHours, setDeliveryHours] = useState(6);
  const [targetRate, setTargetRate] = useState(99.9);
  const [sampleSize, setSampleSize] = useState(10000);

  const [scheduleRandom, setScheduleRandom] = useState<string[]>([]);
  const [scheduleFixed, setScheduleFixed] = useState<string[]>([]);
  const [offsets, setOffsets] = useState<number[]>([]);
  const [maxFixedCoverage, setMaxFixedCoverage] = useState<number>(100);

  // 获取指定小时的在线概率
  const getOnlineProbForHour = (hourInDay: number): number => {
    const h = ((hourInDay % 24) + 24) % 24;
    for (const p of periods) {
      if (p.prob > 0 && p.start < p.end && h >= p.start && h < p.end) {
        return p.prob / 100;
      }
    }
    return 0;
  };

  // 动态计算 maxRounds
  const estimateMaxRounds = (targetCoverage: number, minSuccessRate: number) => {
    if (minSuccessRate <= 0) return 100;
    const n = Math.ceil(Math.log(1 - targetCoverage / 100) / Math.log(1 - minSuccessRate));
    return Math.max(50, n + 10);
  };

  // 构造两种模式的 schedule
  const buildSchedules = () => {
    const deliverySeconds = deliveryHours * 3600;
    
    // 计算最小成功率
    let minSuccessRate = 1.0;
    for (let h = 0; h < 24; h++) {
      minSuccessRate = Math.min(minSuccessRate, getOnlineProbForHour(h));
    }
    
    const maxRounds = estimateMaxRounds(99.9999, minSuccessRate);
    const S = Math.max(10, Math.floor(sampleSize));

    // --- 新增：计算 fixed-order 最大可达覆盖率（理论上能覆盖到的用户比例） ---
    const g = gcd(deliveryHours, 24);
    // active residues modulo g
    const activeResidues = new Set<number>();
    for (let h = 0; h < 24; h++) {
      if (getOnlineProbForHour(h) > 0) activeResidues.add(h % g);
    }
    const reachableFraction = activeResidues.size / g;
    setMaxFixedCoverage(reachableFraction * 100); // e.g. 66.666...

    // 初始化或更新 offsets
    if (offsets.length !== S) {
      const newOffsets: number[] = [];
      for (let i = 0; i < S; i++) {
        newOffsets.push(Math.floor(Math.random() * deliverySeconds));
      }
      setOffsets(newOffsets);
    }

    const currentOffsets = offsets.length === S ? offsets : Array.from({ length: S }, () => Math.floor(Math.random() * deliverySeconds));

    // --- 随机次序 ---
    let missRandom = 1.0;
    const schedRand: string[] = [];

    for (let r = 1; r <= maxRounds; r++) {
      const roundIndex = r - 1;
      const startGlobalHour = roundIndex * deliveryHours;
      let onlineSeconds = 0;

      for (let h = 0; h < deliveryHours; h++) {
        const globalHour = startGlobalHour + h;
        const hourInDay = ((globalHour % 24) + 24) % 24;
        const prob = getOnlineProbForHour(hourInDay);
        onlineSeconds += prob * 3600;
      }

      const p = onlineSeconds / (deliveryHours * 3600);
      const prevMiss = missRandom;
      missRandom *= (1 - p);
      const coverage = (1 - missRandom) * 100;
      const hitThisRound = (prevMiss - missRandom) * 100;

      const days = Math.floor(roundIndex * deliveryHours / 24);
      const startH = (roundIndex * deliveryHours) % 24;
      const endH = ((roundIndex + 1) * deliveryHours) % 24;
      const endDay = Math.floor((roundIndex + 1) * deliveryHours / 24);

      schedRand.push(
        `Round ${r}: Day ${days} ${String(Math.floor(startH)).padStart(2,'0')}:00 → ` +
        `Day ${endDay} ${String(Math.floor(endH)).padStart(2,'0')}:00 ` +
        `| Success: ${(p*100).toFixed(4)}% | Hit: ${hitThisRound.toFixed(4)}% | Coverage: ${coverage.toFixed(6)}%`
      );

      if (coverage >= 99.9999) break;
    }

    // --- 固定次序 ---
    const missProbPerUser = new Array(S).fill(1.0);
    const schedFix: string[] = [];

    for (let r = 1; r <= maxRounds; r++) {
      const roundIndex = r - 1;
      let hitCountThisRound = 0;

      for (let i = 0; i < S; i++) {
        const globalSecond = roundIndex * deliverySeconds + currentOffsets[i];
        const hourInDay = Math.floor((globalSecond / 3600) % 24);
        const p_i = getOnlineProbForHour(hourInDay);

        const prevMiss = missProbPerUser[i];
        missProbPerUser[i] = prevMiss * (1 - p_i);
        hitCountThisRound += (prevMiss - missProbPerUser[i]);
      }

      const avgHitThisRound = (hitCountThisRound / S) * 100;
      const coverage = (1 - (missProbPerUser.reduce((a, b) => a + b, 0) / S)) * 100;

      const days = Math.floor(roundIndex * deliveryHours / 24);
      const startH = (roundIndex * deliveryHours) % 24;
      const endH = ((roundIndex + 1) * deliveryHours) % 24;
      const endDay = Math.floor((roundIndex + 1) * deliveryHours / 24);

      schedFix.push(
        `Round ${r}: Day ${days} ${String(Math.floor(startH)).padStart(2,'0')}:00 → ` +
        `Day ${endDay} ${String(Math.floor(endH)).padStart(2,'0')}:00 ` +
        `| Hit: ${avgHitThisRound.toFixed(4)}% | Coverage: ${coverage.toFixed(6)}%`
      );

      if (coverage >= 99.9999) break;
    }

    setScheduleRandom(schedRand);
    setScheduleFixed(schedFix);
  };

  // greatest common divisor
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);

  useEffect(() => {
    buildSchedules();
  }, [periods, deliveryHours, sampleSize, offsets]);

  const getRoundsForTargetFromSchedule = (sched: string[]) => {
    for (let i = 0; i < sched.length; i++) {
      const m = sched[i].match(/Coverage: ([0-9.]+)%/);
      if (m && parseFloat(m[1]) >= targetRate) {
        return { rounds: i + 1, coverage: parseFloat(m[1]) };
      }
    }
    if (sched.length > 0) {
      const last = sched[sched.length - 1];
      const m = last.match(/Coverage: ([0-9.]+)%/);
      return { rounds: sched.length, coverage: m ? parseFloat(m[1]) : 100 };
    }
    return { rounds: 0, coverage: 0 };
  };

  const targetResultRandom = getRoundsForTargetFromSchedule(scheduleRandom);
  const targetResultFixed = getRoundsForTargetFromSchedule(scheduleFixed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12 px-2">
      <div className="mx-auto" style={{ maxWidth: "1600px" }}>
        <h1 className="text-5xl font-black text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-700">
          EMM Delivery Hit Rate Calculator
        </h1>

        {/* 第一行：Settings */}
        <div className="mb-10">
          <Card className="shadow-2xl">
            <CardHeader><CardTitle className="text-2xl">Settings</CardTitle></CardHeader>
            <CardContent className="space-y-8">
              {/* 上半部分：Total Users & Delivery Hours & Target Coverage Rate */}
              <div className="grid lg:grid-cols-3 gap-8">
                {/* 左列：Total Users & Delivery Hours */}
                <div className="space-y-8">
                  <div>
                    <Label>Total Users</Label>
                    <Input value={totalUsers} disabled className="text-2xl font-bold mt-2" />
                  </div>

                  <div>
                    <Label>Delivery Time per Round (hours)</Label>
                    <Slider value={[deliveryHours]} onValueChange={v => setDeliveryHours(v[0])}
                      min={1} max={48} step={1} className="mt-4" />
                    <div className="text-center text-4xl font-black text-primary mt-4">
                      {deliveryHours} hours/round
                    </div>
                  </div>
                </div>
/*
                {/* 中列：Sample Size for Fixed-order */}
                <div className="space-y-8">
                  <div>
                    <Label className="text-lg">Sample Size for Fixed-order</Label>
                    <Slider value={[sampleSize]} onValueChange={v => setSampleSize(v[0])}
                      min={100} max={200000} step={100} className="mt-4" />
                    <div className="text-center text-4xl font-black text-primary mt-8">
                      {sampleSize}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2 text-center">
                      samples （Larger sample size stabilizes fixed-order results）
                    </div>
                  </div>
                </div>
*/
                {/* 右列：Target Coverage Rate */}
                <div className="space-y-8">
                  <div>
                    <Label className="text-lg">Target Coverage Rate</Label>
                    <Slider value={[targetRate]} onValueChange={v => setTargetRate(v[0])}
                      min={90} max={99.999} step={0.1} className="mt-4" />
                    <div className="text-center text-6xl font-black text-primary mt-8">
                      {targetRate.toFixed(3)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* 分隔线 */}
              <div className="border-t pt-8"></div>

              {/* 下半部分：Daily Online Periods 横铺三列 */}
              <div>
                <h3 className="font-bold text-xl mb-4">Daily Online Periods</h3>
                <div className="grid lg:grid-cols-3 gap-6">
                  {[0,1,2].map(i => (
                    <Card key={i} className={periods[i].prob > 0 ? "border-primary shadow-md" : "opacity-60"}>
                      <CardContent className="pt-6 space-y-5">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Period {i+1}</span>
                          <Badge variant={periods[i].prob > 0 ? "default" : "secondary"}>
                            {periods[i].prob > 0 ? "Active" : "Off"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <Label>Start Hour</Label>
                            <Slider value={[periods[i].start]} onValueChange={v => {
                              const np = [...periods];
                              np[i].start = v[0];
                              if (v[0] >= np[i].end) np[i].end = v[0] + 1;
                              setPeriods(np);
                            }} min={0} max={23} step={1} />
                            <div className="text-center font-bold text-xl mt-2">{periods[i].start}:00</div>
                          </div>
                          <div>
                            <Label>End Hour</Label>
                            <Slider value={[periods[i].end]} onValueChange={v => {
                              const np = [...periods]; np[i].end = v[0];
                              setPeriods(np);
                            }} min={periods[i].start + 1} max={24} step={1} />
                            <div className="text-center font-bold text-xl mt-2">
                              {periods[i].end === 24 ? "24" : periods[i].end}:00
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label>Online Probability</Label>
                          <Slider value={[periods[i].prob]} onValueChange={v => {
                            const np = [...periods]; np[i].prob = v[0];
                            setPeriods(np);
                          }} min={0} max={100} step={5} />
                          <div className="text-right text-4xl font-black text-green-600 mt-3">
                            {periods[i].prob}%
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 第二行：Result 并列两张卡片 */}
        <div className="grid lg:grid-cols-2 gap-10">
          {/* Random-order 卡片 */}
          <Card className="shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">Random-order Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-br from-green-600 to-green-700 text-white rounded-3xl p-8 text-center">
                <p className="text-2xl mb-4">To reach {targetRate.toFixed(1)}% coverage</p>
                <p className="text-6xl font-black">
                  {targetResultRandom.rounds}<span className="text-3xl"> rounds</span>
                </p>
                <p className="text-lg mt-4">Actual: {targetResultRandom.coverage.toFixed(6)}%</p>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 text-center">Schedule</h3>
                <div className="bg-gray-900 text-green-400 font-mono text-xs rounded-lg p-4 max-h-80 overflow-y-auto">
                  {scheduleRandom.map((line, i) => (
                    <div key={i} className={line.includes("100%") ? "text-yellow-300 font-bold" : ""}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fixed-order 卡片 */}
          <Card className="shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">Fixed-order Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-3xl p-8 text-center">
                <p className="text-2xl mb-4">To reach {targetRate.toFixed(1)}% coverage</p>
                <p className="text-6xl font-black">
                  {targetResultFixed.rounds}<span className="text-3xl"> rounds</span>
                </p>
                <p className="text-lg mt-4">Actual: {targetResultFixed.coverage.toFixed(6)}%</p>
                {maxFixedCoverage < 99.999 && (
                  <p className="text-sm mt-2 text-yellow-200">
                    Note: maximum achievable coverage under strict fixed-order ≈ {maxFixedCoverage.toFixed(3)}% due to periodic alignment (deliveryHours gcd 24).
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 text-center">Schedule</h3>
                <div className="bg-gray-900 text-blue-400 font-mono text-xs rounded-lg p-4 max-h-80 overflow-y-auto">
                  {scheduleFixed.map((line, i) => (
                    <div key={i} className={line.includes("100%") ? "text-yellow-300 font-bold" : ""}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
