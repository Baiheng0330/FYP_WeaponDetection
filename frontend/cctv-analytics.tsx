import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid, Legend } from "recharts";

const BACKEND_URL = 'http://localhost:8000';
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A020F0", "#FF6384", "#36A2EB", "#FFCE56"];

export default function CCTVAnalytics() {
  const [timeline, setTimeline] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [distType, setDistType] = useState<'label'|'location'|'camera_name'>('label');
  const [granularity, setGranularity] = useState<'day'|'month'>('day');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${BACKEND_URL}/analytics/incidents/timeline?granularity=${granularity}`)
      .then(res => res.json())
      .then(setTimeline);
  }, [granularity]);

  useEffect(() => {
    setLoading(true);
    fetch(`${BACKEND_URL}/analytics/incidents/distribution?by=${distType}`)
      .then(res => res.json())
      .then(setDistribution)
      .finally(() => setLoading(false));
  }, [distType]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Incident Analytics Dashboard</h1>
        </div>
      </div>
      <Tabs defaultValue="trend" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800 mb-6">
          <TabsTrigger value="trend" className="data-[state=active]:bg-blue-600">Trendline</TabsTrigger>
          <TabsTrigger value="distribution" className="data-[state=active]:bg-blue-600">Distribution</TabsTrigger>
        </TabsList>
        <TabsContent value="trend">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">Incidents Over Time</CardTitle>
              <div className="flex gap-2 mt-2">
                <button className={`px-3 py-1 rounded ${granularity==='day'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>setGranularity('day')}>Day</button>
                <button className={`px-3 py-1 rounded ${granularity==='month'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>setGranularity('month')}>Month</button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={timeline} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" stroke="#ccc" />
                  <YAxis stroke="#ccc" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="distribution">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">Incident Distribution</CardTitle>
              <div className="flex gap-2 mt-2">
                <button className={`px-3 py-1 rounded ${distType==='label'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>setDistType('label')}>Type</button>
                <button className={`px-3 py-1 rounded ${distType==='location'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>setDistType('location')}>Location</button>
                <button className={`px-3 py-1 rounded ${distType==='camera_name'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>setDistType('camera_name')}>Camera</button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={distribution} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={80} label>
                      {distribution.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={distribution} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" stroke="#ccc" />
                    <YAxis stroke="#ccc" allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 