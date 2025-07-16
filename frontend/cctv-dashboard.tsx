"use client"

import { useState, useEffect } from "react"
import {
  AlertTriangle,
  Camera,
  Eye,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Volume2,
  VolumeX,
  Zap,
  Shield,
  Clock,
  MapPin,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ExternalLink, PenIcon as Gun } from "lucide-react"
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ReactSelect from "react-select";
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid, Legend } from "recharts";
import React from "react";
import { TooltipProps } from 'recharts';

const BACKEND_URL = 'http://localhost:8000';

interface Incident {
  id: string
  alertName: string
  alertType: string
  triggerTime: string
  camera: string
  location: string
  clipThumbnail: string
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A020F0", "#FF6384", "#36A2EB", "#FFCE56"];

// Custom tooltip for PieChart with white text
const CustomPieTooltip = ({ active, payload }: TooltipProps<any, any>) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#222', border: '1px solid #444', color: '#fff', padding: 8, borderRadius: 6 }}>
        <span style={{ color: '#fff', fontWeight: 600 }}>{payload[0].name}</span>: <span style={{ color: '#fff' }}>{payload[0].value}</span>
      </div>
    );
  }
  return null;
};

// Helper: convert options to react-select format
const toSelectOptions = (arr: string[]) => arr.map(v => ({ value: v, label: v }));

export default function CCTVDashboard() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const [incidents, setIncidents] = useState<any[]>([])
  const [alertCount, setAlertCount] = useState(0)
  const [camName, setCamName] = useState('Main Entrance')
  const [camLocation, setCamLocation] = useState('Building A - Front')
  const [videoError, setVideoError] = useState(false)
  const [videoTimestamp, setVideoTimestamp] = useState(0)
  const [modalImg, setModalImg] = useState<string | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCameras, setSelectedCameras] = useState<string[]>([]);
  const [timeline, setTimeline] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [distType, setDistType] = useState<'label'|'location'|'camera_name'>('label');
  const [granularity, setGranularity] = useState<'day'|'month'>('day');
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const locationOptions = Array.from(new Set(incidents.map(i => i.location || "Building A - Front")));
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true)
    setVideoTimestamp(Date.now()) // Set initial timestamp after mount
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch alert count
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/alerts`);
        const data = await res.json();
        setAlertCount(data.alerts || 0);
      } catch {}
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch incidents (auto-refresh)
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        let url = `${BACKEND_URL}/incidents`;
        if (dateRange[0] && dateRange[1]) {
          // Format dates as YYYY-MM-DD
          const start = dateRange[0].toISOString().slice(0, 10);
          const end = dateRange[1].toISOString().slice(0, 10);
          url += `?start_date=${start}&end_date=${end}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        setIncidents(data);
        if (data.length > 0) {
          setCamName(data[0].camera_name || 'Main Entrance');
          setCamLocation(data[0].location || 'Building A - Front');
        }
      } catch {}
    };
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 2000);
    return () => clearInterval(interval);
  }, [dateRange]);

  // Fetch notification settings
  useEffect(() => {
    const fetchNotificationSettings = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/settings/notifications`);
        const data = await res.json();
        setNotificationsEnabled(data.enabled || false);
      } catch {}
    };
    fetchNotificationSettings();
  }, []);

  // Fetch analytics data (with auto-refresh)
  useEffect(() => {
    let isMounted = true;
    const fetchTimeline = () => {
      fetch(`${BACKEND_URL}/analytics/incidents/timeline?granularity=${granularity}`)
        .then(res => res.json())
        .then(data => { if (isMounted) setTimeline(data); });
    };
    fetchTimeline();
    const interval = setInterval(fetchTimeline, 5000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [granularity]);

  useEffect(() => {
    let isMounted = true;
    const fetchDistribution = () => {
      fetch(`${BACKEND_URL}/analytics/incidents/distribution?by=${distType}`)
        .then(res => res.json())
        .then(data => { if (isMounted) setDistribution(data); })
        .finally(() => { if (isMounted) setAnalyticsLoading(false); });
    };
    fetchDistribution();
    const interval = setInterval(fetchDistribution, 5000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [distType]);

  // Video error handler
  const handleVideoError = () => {
    setVideoError(true);
    setTimeout(() => {
      setVideoError(false)
      setVideoTimestamp(Date.now()) // Update timestamp on retry
    }, 5000);
  };

  const handleVideoLoad = () => {
    setVideoError(false);
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    try {
      const res = await fetch(`${BACKEND_URL}/settings/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });
      
      if (res.ok) {
        setNotificationsEnabled(enabled);
      }
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  };

  // Extract unique types, statuses, and cameras from incidents
  const typeOptions = Array.from(new Set(incidents.map(i => i.label)));
  const statusOptions = Array.from(new Set(incidents.map(i => i.status || "Active")));
  const cameraOptions = Array.from(new Set(incidents.map(i => i.camera_name || i.camera || "Camera 1")));

  // Filtering logic
  const filteredIncidents = incidents.filter((incident) => {
    // Type filter
    let typeMatch = selectedTypes.length === 0 || selectedTypes.includes(incident.label);
    // Camera filter
    let cameraMatch = selectedCameras.length === 0 || selectedCameras.includes(incident.camera_name || incident.camera || "Camera 1");
    // Location filter
    let locationMatch = selectedLocations.length === 0 || selectedLocations.includes(incident.location || "Building A - Front");
    return typeMatch && cameraMatch && locationMatch;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold">FYP Real-Time Security Command Center</h1>
          </div>
          <Separator orientation="vertical" className="h-8 bg-gray-600" />
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Clock className="w-4 h-4" />
            {mounted ? currentTime.toLocaleString() : null}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            {alertCount} Alerts
          </Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs defaultValue="live-feed" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800 mb-6">
          <TabsTrigger value="live-feed" className="data-[state=active]:bg-blue-600">
            <Camera className="w-4 h-4 mr-2" />
            Live Camera Feed
          </TabsTrigger>
          <TabsTrigger value="incidents" className="data-[state=active]:bg-blue-600">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Incidents Dashboard
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600">
            <Eye className="w-4 h-4 mr-2" />
            Data Visualization
          </TabsTrigger>
        </TabsList>

        {/* Live Feed Tab */}
        <TabsContent value="live-feed">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Video Feed */}
            <div className="lg:col-span-3">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Camera className="w-5 h-5 text-blue-400" />
                      <div>
                        <CardTitle className="text-white">{camName}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-400">{camLocation}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Online</Badge>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-xs text-red-400">REC</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div
                    className={`relative ${isFullscreen ? "h-screen" : "aspect-video"} bg-black rounded-b-lg overflow-hidden`}
                  >
                    {/* Live Video Feed */}
                    {!videoError && mounted ? (
                      <img
                        src={`${BACKEND_URL}/video?t=${videoTimestamp}`}
                        alt="Live Feed"
                        className="absolute inset-0 w-full h-full object-contain"
                        onError={handleVideoError}
                        onLoad={handleVideoLoad}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <div className="text-center">
                          <Camera className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-400">{mounted ? "Camera Feed Unavailable" : "Loading..."}</p>
                          <p className="text-xs text-gray-500 mt-2">{mounted && videoError ? "Attempting to reconnect..." : ""}</p>
                        </div>
                      </div>
                    )}

                    {/* Video Overlay */}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm font-mono bg-black/50 px-2 py-1 rounded">
                        {mounted ? currentTime.toLocaleTimeString() : null}
                      </span>
                    </div>

                    {/* Video Controls */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-black/70 rounded-lg px-4 py-2">
                      <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                        <Pause className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Separator orientation="vertical" className="h-6 bg-gray-500" />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/20"
                        onClick={() => setAudioEnabled(!audioEnabled)}
                      >
                        {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/20"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                      >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Controls */}
            <div className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    System Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Motion Detection</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Night Vision</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Auto Recording</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Alert Notifications</span>
                    <Switch 
                      checked={notificationsEnabled}
                      onCheckedChange={handleNotificationToggle}
                    />
                  </div>
                  <Separator className="bg-gray-600" />
                  <Button className="w-full bg-transparent" variant="outline">
                    <Zap className="w-4 h-4 mr-2" />
                    Emergency Alert
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">System Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Storage Used</span>
                    <span className="text-white">2.4TB / 5TB</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: "48%" }} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Network Status</span>
                    <span className="text-green-400">Stable</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Last Backup</span>
                    <span className="text-white">2 hours ago</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Security Incidents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filter Row aligned with table columns */}
              <div className="grid grid-cols-5 gap-2 mb-2 items-end">
                {/* Alert Name (Type) Filter */}
                <div>
                  <ReactSelect
                    isMulti
                    options={toSelectOptions(typeOptions)}
                    value={toSelectOptions(selectedTypes)}
                    onChange={(opts: any) => setSelectedTypes((opts || []).map((o: any) => o.value))}
                    placeholder="All Types"
                    classNamePrefix="react-select"
                  />
                </div>
                {/* Trigger Time (Date Range) Filter */}
                <div>
                  <ReactDatePicker
                    selectsRange
                    startDate={dateRange[0]}
                    endDate={dateRange[1]}
                    onChange={(update) => setDateRange(update)}
                    isClearable
                    className="rounded px-2 py-1 text-black w-full"
                    placeholderText="Date Range"
                  />
                </div>
                {/* Camera Filter */}
                <div>
                  <ReactSelect
                    isMulti
                    options={toSelectOptions(cameraOptions)}
                    value={toSelectOptions(selectedCameras)}
                    onChange={(opts: any) => setSelectedCameras((opts || []).map((o: any) => o.value))}
                    placeholder="All Cameras"
                    classNamePrefix="react-select"
                  />
                </div>
                {/* Location Filter */}
                <div>
                  <ReactSelect
                    isMulti
                    options={toSelectOptions(locationOptions)}
                    value={toSelectOptions(selectedLocations)}
                    onChange={(opts: any) => setSelectedLocations((opts || []).map((o: any) => o.value))}
                    placeholder="All Locations"
                    classNamePrefix="react-select"
                  />
                </div>
                {/* Clips: No filter, just empty cell for alignment */}
                <div></div>
              </div>
              {/* Incidents Table */}
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700 hover:bg-gray-700/50">
                    <TableHead className="text-gray-300">Alert Name</TableHead>
                    <TableHead className="text-gray-300">Trigger Time</TableHead>
                    <TableHead className="text-gray-300">Camera</TableHead>
                    <TableHead className="text-gray-300">Location</TableHead>
                    <TableHead className="text-gray-300">Clips</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncidents.length === 0 && (
                    <tr>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-400">No incidents detected yet.</TableCell>
                    </tr>
                  )}
                  {filteredIncidents.map((incident) => {
                    const alertName = `${incident.label.charAt(0).toUpperCase() + incident.label.slice(1)} alert`;
                    const camera = incident.camera_name || incident.camera || 'Camera 1';
                    const location = incident.location || 'Building A - Front';
                    const imgUrl = `${BACKEND_URL}${incident.image}`;
                    return (
                      <TableRow key={incident.id} className="border-gray-700 hover:bg-gray-700/50">
                        <TableCell className="text-white font-medium">{alertName}</TableCell>
                        <TableCell className="text-gray-300">{incident.timestamp.replace(/_/g, ':').replace(/-/g, '/')}</TableCell>
                        <TableCell>
                          <span className="text-blue-400">{camera}</span>
                        </TableCell>
                        <TableCell className="text-gray-300">{location}</TableCell>
                        <TableCell>
                          <img
                            src={imgUrl}
                            alt="Incident clip"
                            className="w-20 h-15 object-cover rounded border border-gray-600 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                            onClick={() => setModalImg(imgUrl)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">Incident Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex gap-2 mb-2">
                  <button className={`px-3 py-1 rounded ${granularity==='day'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>setGranularity('day')}>Day</button>
                  <button className={`px-3 py-1 rounded ${granularity==='month'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>setGranularity('month')}>Month</button>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={timeline} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="period" stroke="#ccc" />
                    <YAxis stroke="#ccc" allowDecimals={false} />
                    <ReTooltip contentStyle={{ background: '#222', border: '1px solid #444', color: '#fff' }} />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#36A2EB" strokeWidth={3} dot={{ r: 4, fill: '#36A2EB' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <Separator className="my-8 bg-gray-700" />
              <div className="mb-6">
                <div className="flex gap-2 mb-2">
                  <button className={`px-3 py-1 rounded ${distType==='label'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>setDistType('label')}>Type</button>
                  <button className={`px-3 py-1 rounded ${distType==='location'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>setDistType('location')}>Location</button>
                  <button className={`px-3 py-1 rounded ${distType==='camera_name'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>setDistType('camera_name')}>Camera</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={distribution}
                        dataKey="count"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent, x, y }) => (
                          <text x={x} y={y} fill="#fff" fontSize={13} fontWeight={600} textAnchor="middle" dominantBaseline="central">
                            {name}
                          </text>
                        )}
                      >
                        {distribution.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <ReTooltip content={CustomPieTooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={distribution} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis dataKey="category" stroke="#ccc" />
                      <YAxis stroke="#ccc" allowDecimals={false} />
                      <ReTooltip contentStyle={{ background: '#222', border: '1px solid #444', color: '#fff' }} />
                      <Legend />
                      <Bar dataKey="count" fill="#36A2EB" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal for enlarged image */}
      {modalImg && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80" 
          onClick={() => setModalImg(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <img 
              src={modalImg} 
              alt="Enlarged incident clip" 
              className="max-w-full max-h-full rounded-lg border-2 border-gray-600"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 text-white hover:bg-white/20"
              onClick={() => setModalImg(null)}
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
