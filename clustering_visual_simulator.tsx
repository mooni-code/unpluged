import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  RotateCcw, 
  MapPin,
  Thermometer,
  Droplets,
  CloudSun,
  Snowflake,
  Sun,
  Leaf,
  Pen,
  Eraser,
  MousePointer
} from 'lucide-react';

// 1. 제공해주신 실제 지역별 기상 데이터 (10개)
const WEATHER_DATA = [
  { id: 1, region: '서울', season: '여름', temp: 28, humidity: 80, icon: Sun },
  { id: 2, region: '부산', season: '여름', temp: 26, humidity: 85, icon: Sun },
  { id: 3, region: '제주', season: '여름', temp: 29, humidity: 82, icon: Sun },
  { id: 4, region: '서울', season: '겨울', temp: -2, humidity: 45, icon: Snowflake },
  { id: 5, region: '춘천', season: '겨울', temp: -5, humidity: 40, icon: Snowflake },
  { id: 6, region: '대전', season: '겨울', temp: 0, humidity: 50, icon: Snowflake },
  { id: 7, region: '서울', season: '봄', temp: 15, humidity: 60, icon: Leaf },
  { id: 8, region: '강릉', season: '가을', temp: 18, humidity: 65, icon: CloudSun },
  { id: 9, region: '광주', season: '봄', temp: 16, humidity: 62, icon: Leaf },
  { id: 10, region: '대구', season: '가을', temp: 19, humidity: 68, icon: CloudSun }
];

// 의미론적 클러스터 테마 (기온에 따라 겨울, 봄가을, 여름으로 맵핑)
const THEME_COLORS = {
  winter: { name: '춥고 건조한 겨울', bg: '#3B82F6', stroke: '#1D4ED8', fillLight: 'rgba(59, 130, 246, 0.15)' }, // Blue
  mild: { name: '온화한 봄/가을', bg: '#10B981', stroke: '#047857', fillLight: 'rgba(16, 185, 129, 0.15)' },   // Green
  summer: { name: '덥고 다습한 여름', bg: '#EF4444', stroke: '#B91C1C', fillLight: 'rgba(239, 68, 68, 0.15)' }  // Red
};

export default function App() {
  const [unplacedCards, setUnplacedCards] = useState(WEATHER_DATA);
  const [placedPoints, setPlacedPoints] = useState([]);
  
  // Drawing & Manual Clustering State
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);

  const svgRef = useRef(null);

  // Axis Specs
  const xRange = [-10, 40]; // 기온
  const yRange = [0, 100];  // 습도

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e, card) => {
    e.dataTransfer.setData('text/plain', card.id.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDrawMode) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (isDrawMode) return; // 펜 모드일 때는 드롭 방지

    const cardId = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!cardId) return;

    const svgRect = svgRef.current.getBoundingClientRect();
    // 반응형 크기에 맞춰 SVG 좌표계(800x500)로 변환
    const scaleX = 800 / svgRect.width;
    const scaleY = 500 / svgRect.height;
    const dropX = (e.clientX - svgRect.left) * scaleX;
    const dropY = (e.clientY - svgRect.top) * scaleY;

    const card = unplacedCards.find(c => c.id === cardId);
    if (card) {
      setUnplacedCards(prev => prev.filter(c => c.id !== cardId));
      // 데이터 값이 아닌 실제 마우스 드롭 좌표(dropX, dropY)를 저장
      setPlacedPoints(prev => [...prev, { ...card, x: dropX, y: dropY }]);
    }
  };

  // 펜 툴 그리기 핸들러
  const handlePointerDown = (e) => {
    if (!isDrawMode) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const scaleX = 800 / svgRect.width;
    const scaleY = 500 / svgRect.height;
    const x = (e.clientX - svgRect.left) * scaleX;
    const y = (e.clientY - svgRect.top) * scaleY;
    setCurrentPath([{ x, y }]);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDrawMode || !currentPath) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const scaleX = 800 / svgRect.width;
    const scaleY = 500 / svgRect.height;
    const x = (e.clientX - svgRect.left) * scaleX;
    const y = (e.clientY - svgRect.top) * scaleY;
    setCurrentPath(prev => [...prev, { x, y }]);
  };

  const handlePointerUp = (e) => {
    if (!isDrawMode || !currentPath) return;
    setPaths(prev => [...prev, currentPath]);
    setCurrentPath(null);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // 초기화
  const resetBoard = () => {
    setUnplacedCards(WEATHER_DATA);
    setPlacedPoints([]);
    setPaths([]);
    setCurrentPath(null);
    setIsDrawMode(false);
  };

  // 데이터 좌표를 SVG 픽셀 좌표로 변환 (축 그리기용)
  const mapCoords = (dataX, dataY, svgWidth = 800, svgHeight = 500) => {
    const marginX = 70;
    const marginY = 60;
    
    const px = marginX + ((dataX - xRange[0]) / (xRange[1] - xRange[0])) * (svgWidth - marginX * 2);
    const py = svgHeight - marginY - ((dataY - yRange[0]) / (yRange[1] - yRange[0])) * (svgHeight - marginY * 2);
    return { x: px, y: py };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-sky-400 to-indigo-500 rounded-xl shadow-md">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                지역별 기상 패턴 수동 군집화 (비지도학습 시연용)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                X축: 일평균 기온(°C) / Y축: 평균 상대습도(%) — 카드를 원하는 위치에 자유롭게 놓고 펜 툴로 그룹을 묶어보세요.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsDrawMode(!isDrawMode)}
              className={`py-2 px-4 font-semibold text-sm rounded-lg shadow-md flex items-center gap-2 transition active:scale-95 ${
                isDrawMode 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
              }`}
            >
              {isDrawMode ? <Pen className="w-4 h-4 fill-current" /> : <MousePointer className="w-4 h-4" />}
              {isDrawMode ? '펜 모드 (그리기 활성화)' : '배치 모드 (드래그 활성화)'}
            </button>
            <button
              onClick={() => setPaths([])}
              className="py-2 px-4 bg-rose-100 hover:bg-rose-200 text-rose-700 font-semibold text-sm rounded-lg border border-rose-200 flex items-center gap-2 transition active:scale-95"
            >
              <Eraser className="w-4 h-4" /> 선 지우기
            </button>
            <button
              onClick={resetBoard}
              className="py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-sm rounded-lg border border-slate-300 flex items-center gap-2 transition active:scale-95 ml-2"
            >
              <RotateCcw className="w-4 h-4" /> 전체 초기화
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT PANEL: CARD DECK */}
        <aside className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-700 flex items-center gap-2">
                기상 데이터 카드
              </h2>
            </div>
            
            <p className="text-xs text-slate-500 mb-4 leading-relaxed bg-slate-50 p-2 rounded">
              카드를 드래그하여 우측 그래프의 원하는 위치에 직접 놓아보세요.
            </p>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 pb-4">
              {unplacedCards.length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-10 flex flex-col items-center gap-2">
                  <MapPin className="w-8 h-8 opacity-20" />
                  모든 데이터가 그래프에 배치되었습니다.
                </div>
              ) : (
                unplacedCards.map(card => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, card)}
                      className="group p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md hover:border-indigo-300 cursor-grab active:cursor-grabbing flex flex-col gap-2 transition-all transform hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Icon className="w-4 h-4 text-indigo-500" />
                          {card.region} {card.season}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Thermometer className="w-3.5 h-3.5 text-rose-500" /> {card.temp}°C
                        </span>
                        <span className="flex items-center gap-1">
                          <Droplets className="w-3.5 h-3.5 text-blue-500" /> {card.humidity}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* RIGHT PANEL: COORDINATE GRAPH */}
        <section className="lg:col-span-9 flex flex-col gap-4">
          <div 
            className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 relative overflow-hidden flex-1 flex flex-col min-h-[500px] ${isDrawMode ? 'cursor-crosshair' : ''}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* Visual indicator for drag zone */}
            {unplacedCards.length > 0 && placedPoints.length === 0 && !isDrawMode && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                <div className="bg-white/80 backdrop-blur px-6 py-3 rounded-full shadow-lg border border-slate-200 text-slate-600 font-semibold flex items-center gap-2 animate-bounce">
                  카드를 이곳으로 드래그 앤 드롭 하세요!
                </div>
              </div>
            )}

            <div className="flex-1 w-full bg-slate-50 rounded-lg border border-slate-200 relative overflow-hidden">
              <svg
                ref={svgRef}
                className="w-full h-full touch-none"
                viewBox="0 0 800 500"
                preserveAspectRatio="xMidYMid meet"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {/* 1. Grid & Axes Lines */}
                <g className="grid-lines">
                  {/* Y축 보조선 (습도) */}
                  {[0, 20, 40, 60, 80, 100].map(val => {
                    const pos = mapCoords(0, val);
                    return (
                      <g key={`grid-y-${val}`}>
                        <line x1={70} y1={pos.y} x2={730} y2={pos.y} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
                        <text x={55} y={pos.y + 4} fill="#64748B" fontSize="11" textAnchor="end">{val}%</text>
                      </g>
                    );
                  })}
                  {/* X축 보조선 (기온) */}
                  {[-10, 0, 10, 20, 30, 40].map(val => {
                    const pos = mapCoords(val, 0);
                    return (
                      <g key={`grid-x-${val}`}>
                        <line x1={pos.x} y1={60} x2={pos.x} y2={440} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
                        <text x={pos.x} y={460} fill="#64748B" fontSize="11" textAnchor="middle">{val}°C</text>
                      </g>
                    );
                  })}

                  {/* 메인 축(Axis) */}
                  {/* X축 중심선 (Y=0은 너무 밑이므로 테두리 박스로 대체하거나 0도씨 선 강조) */}
                  <line x1={mapCoords(0,0).x} y1={60} x2={mapCoords(0,0).x} y2={440} stroke="#CBD5E1" strokeWidth="2" /> {/* 기온 0도 기준선 */}
                  <text x={mapCoords(0,0).x + 5} y={75} fill="#94A3B8" fontSize="10" fontStyle="italic">빙점 (0°C)</text>
                </g>

                {/* Axis Labels */}
                <text x={400} y={485} fill="#334155" fontSize="13" fontWeight="bold" textAnchor="middle">
                  일평균 기온 (°C) ➔
                </text>
                <text x={25} y={250} fill="#334155" fontSize="13" fontWeight="bold" textAnchor="middle" transform="rotate(-90 25 250)">
                  평균 상대습도 (%) ➔
                </text>

                {/* 2. Drawn Paths (펜 툴 그리기 결과) */}
                {paths.map((path, index) => (
                  <path
                    key={`path-${index}`}
                    d={path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                    stroke="#8B5CF6" // 보라색 마커
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.7"
                  />
                ))}
                {currentPath && (
                  <path
                    d={currentPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                    stroke="#8B5CF6"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.7"
                  />
                )}

                {/* 3. Placed Data Points (Cards) */}
                {placedPoints.map((p) => {
                  return (
                    <g key={p.id} className="transition-all duration-300 hover:scale-105" transform={`translate(${p.x}, ${p.y})`}>
                      {/* 미니 카드 배경 */}
                      <rect 
                        x="-45" 
                        y="-18" 
                        width="90" 
                        height="36" 
                        rx="6" 
                        fill="#FFFFFF"
                        stroke="#475569"
                        strokeWidth="2"
                        className="drop-shadow-md"
                      />
                      {/* 카드 텍스트 */}
                      <text x="0" y="2" fill="#1E293B" fontSize="12" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                        {p.region} ({p.season})
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}