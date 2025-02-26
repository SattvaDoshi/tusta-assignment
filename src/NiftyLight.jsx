import React, { useEffect, useState, useRef } from 'react';
import * as LightweightCharts from 'lightweight-charts';
import { Pen, Edit, Trash2, RefreshCw, ChevronDown } from 'lucide-react';

const NiftyChart = () => {
  const chartContainerRef = useRef(null);
  const [isDrawingTrendline, setIsDrawingTrendline] = useState(false);
  const [isEditingTrendline, setIsEditingTrendline] = useState(false);
  const [selectedTrendline, setSelectedTrendline] = useState(null);
  const [firstPoint, setFirstPoint] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState('nifty50');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const trendlineSeriesRef = useRef([]);

  // Refs to track current state
  const isDrawingRef = useRef(isDrawingTrendline);
  const isEditingRef = useRef(isEditingTrendline);
  const firstPointRef = useRef(firstPoint);
  const selectedTrendlineRef = useRef(selectedTrendline);

  // Update refs when state changes
  useEffect(() => {
    isDrawingRef.current = isDrawingTrendline;
  }, [isDrawingTrendline]);

  useEffect(() => {
    isEditingRef.current = isEditingTrendline;
  }, [isEditingTrendline]);

  useEffect(() => {
    firstPointRef.current = firstPoint;
  }, [firstPoint]);

  useEffect(() => {
    selectedTrendlineRef.current = selectedTrendline;
  }, [selectedTrendline]);

  // Fetch data when asset changes
  useEffect(() => {
    fetchData(selectedAsset);
  }, [selectedAsset]);

  // Chart configuration and initialization
  useEffect(() => {
    if (chartData.length === 0 || !chartContainerRef.current) return;
    setIsLoading(false);

    try {
      if (chartRef.current) {
        chartRef.current.remove();
      }

      const chart = LightweightCharts.createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth || 800,
        height: chartContainerRef.current.clientHeight || 600,
        layout: { 
          background: { color: '#1E1E30' },
          textColor: '#D9D9D9',
          fontSize: 12,
          fontFamily: 'Roboto, sans-serif',
        },
        grid: { 
          vertLines: { color: '#2B2B43', style: 1, visible: true },
          horzLines: { color: '#2B2B43', style: 1, visible: true }
        },
        crosshair: { 
          mode: LightweightCharts.CrosshairMode.Normal,
          vertLine: { color: '#5f6380', width: 1, style: 1, labelBackgroundColor: '#6366F1' },
          horzLine: { color: '#5f6380', width: 1, style: 1, labelBackgroundColor: '#6366F1' }
        },
        rightPriceScale: {
          borderColor: '#2B2B43',
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: '#2B2B43',
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 12,
          barSpacing: 5,
        },
        watermark: {
          visible: true,
          text: assetDisplayName(selectedAsset),
          color: 'rgba(99, 102, 241, 0.15)',
          fontSize: 48,
          fontFamily: 'Roboto, sans-serif',
          horzAlign: 'center',
          vertAlign: 'center',
        },
      });

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#10B981',
        downColor: '#EF4444',
        borderVisible: false,
        wickUpColor: '#10B981',
        wickDownColor: '#EF4444',
      });

      candlestickSeriesRef.current = candlestickSeries;
      chartRef.current = chart;

      const formattedChartData = chartData.map(item => {
        let timeValue = typeof item.time === 'string' 
          ? Math.floor(new Date(item.time).getTime() / 1000)
          : item.time > 10000000000 
            ? Math.floor(item.time / 1000) 
            : item.time;

        return {
          time: timeValue,
          open: Number(item.open) || 0,
          high: Number(item.high) || 0,
          low: Number(item.low) || 0,
          close: Number(item.close) || 0,
        };
      });

      candlestickSeries.setData(formattedChartData);
      chart.timeScale().fitContent();

      const handleClick = (param) => {
        if ((!isDrawingRef.current && !isEditingRef.current) || !param.time || !param.point) return;
        
        const price = candlestickSeries.coordinateToPrice(param.point.y);
        if (!price) return;

        if (isDrawingRef.current) {
          if (!firstPointRef.current) {
            setFirstPoint({ time: param.time, price });
          } else {
            const newSeries = chart.addLineSeries({
              color: '#6366F1',
              lineWidth: 2,
              lineStyle: LightweightCharts.LineStyle.Solid,
              lastValueVisible: false,
            });
            
            const lineData = [
              { time: firstPointRef.current.time, value: firstPointRef.current.price },
              { time: param.time, value: price },
            ];
            
            newSeries.setData(lineData);
            trendlineSeriesRef.current.push({
              series: newSeries,
              data: lineData,
              id: Date.now(),
            });
            
            setFirstPoint(null);
            setIsDrawingTrendline(false);
          }
        } else if (isEditingRef.current && selectedTrendlineRef.current) {
          const updatedLineData = [
            selectedTrendlineRef.current.data[0],
            { time: param.time, value: price },
          ];
          
          selectedTrendlineRef.current.series.setData(updatedLineData);
          
          const updatedTrendlines = trendlineSeriesRef.current.map(trendline => {
            if (trendline.id === selectedTrendlineRef.current.id) {
              return { ...trendline, data: updatedLineData };
            }
            return trendline;
          });
          
          trendlineSeriesRef.current = updatedTrendlines;
          setIsEditingTrendline(false);
          setSelectedTrendline(null);
        }
      };

      chart.subscribeClick(handleClick);

      chart.subscribeCrosshairMove((param) => {
        if (!param.point || !param.time || trendlineSeriesRef.current.length === 0) return;
        
        const price = candlestickSeries.coordinateToPrice(param.point.y);
        if (!price) return;
        
        trendlineSeriesRef.current.forEach(trendline => {
          trendline.series.applyOptions({ lineWidth: 2 });
        });
        
        const closestTrendline = findClosestTrendline(param.time, price);
        if (closestTrendline) {
          closestTrendline.series.applyOptions({ lineWidth: 3 });
        }
      });

      const findClosestTrendline = (time, price) => {
        if (trendlineSeriesRef.current.length === 0) return null;
        
        let closestDistance = Infinity;
        let closestTrendline = null;
        
        trendlineSeriesRef.current.forEach(trendline => {
          const { data } = trendline;
          if (data.length !== 2) return;
          
          const x1 = data[0].time;
          const y1 = data[0].value;
          const x2 = data[1].time;
          const y2 = data[1].value;
          
          const distance = Math.min(
            Math.sqrt(Math.pow(time - x1, 2) + Math.pow(price - y1, 2)),
            Math.sqrt(Math.pow(time - x2, 2) + Math.pow(price - y2, 2))
          );
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestTrendline = trendline;
          }
        });
        
        return closestDistance < 50 ? closestTrendline : null;
      };

      const handleResize = () => {
        if (chartRef.current && chartContainerRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.unsubscribeClick(handleClick);
        chart.remove();
      };
    } catch (err) {
      console.error('Chart initialization error:', err);
      setError(err.message);
      setIsLoading(false);
    }
  }, [chartData]);

  // Fetch data function updated for multiple assets
  const fetchData = async (asset) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/${asset}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const json = await response.json();
      const result = json.chart?.result?.[0];
      if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
        throw new Error('Invalid data format from API');
      }

      const { timestamp, indicators: { quote: [quote] } } = result;
      const formattedData = timestamp.map((time, i) => ({
        time,
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i],
      }));

      setChartData(formattedData);
    } catch (error) {
      console.error(`Error fetching ${asset} data:`, error);
      const today = new Date();
      const mockData = Array.from({ length: 60 }, (_, i) => {
        const date = new Date();
        date.setDate(today.getDate() - (60 - i));
        const timestamp = Math.floor(date.getTime() / 1000);
        const prevDay = i > 0 ? mockData[i-1] : { close: 18000 + Math.random() * 500 };
        const basePrice = prevDay.close;
        const volatility = basePrice * 0.015;
        
        const open = basePrice + (Math.random() * volatility * 2 - volatility);
        const high = open + Math.random() * volatility;
        const low = open - Math.random() * volatility;
        const close = low + Math.random() * (high - low);
        
        return { time: timestamp, open, high, low, close };
      });
      setChartData(mockData);
    } finally {
      setIsLoading(false);
    }
  };

  const startDrawingTrendline = () => {
    setIsDrawingTrendline(true);
    setIsEditingTrendline(false);
    setSelectedTrendline(null);
    setFirstPoint(null);
  };

  const startEditingTrendline = () => {
    if (trendlineSeriesRef.current.length === 0) return;
    
    setIsEditingTrendline(true);
    setIsDrawingTrendline(false);
    setFirstPoint(null);
    setSelectedTrendline(trendlineSeriesRef.current[trendlineSeriesRef.current.length - 1]);
    
    trendlineSeriesRef.current.forEach(trendline => {
      trendline.series.applyOptions({ lineWidth: 2, color: '#6366F1' });
    });
    trendlineSeriesRef.current[trendlineSeriesRef.current.length - 1].series.applyOptions({
      lineWidth: 3,
      color: '#EC4899'
    });
  };

  const clearTrendlines = () => {
    setIsDrawingTrendline(false);
    setIsEditingTrendline(false);
    setSelectedTrendline(null);
    setFirstPoint(null);
    trendlineSeriesRef.current.forEach(trendline => chartRef.current?.removeSeries(trendline.series));
    trendlineSeriesRef.current = [];
  };

  const cancelAction = () => {
    setIsDrawingTrendline(false);
    setIsEditingTrendline(false);
    setSelectedTrendline(null);
    setFirstPoint(null);
    trendlineSeriesRef.current.forEach(trendline => {
      trendline.series.applyOptions({ lineWidth: 2, color: '#6366F1' });
    });
  };

  const assetDisplayName = (asset) => {
    const names = {
      nifty50: 'NIFTY 50',
      banknifty: 'BANK NIFTY',
      sensex: 'SENSEX',
      reliance: 'RELIANCE',
      hdfc: 'HDFC BANK'
    };
    return names[asset] || asset.toUpperCase();
  };

  if (error) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400 text-center p-8 bg-gray-800 rounded-lg max-w-md shadow-lg border border-gray-700">
          <h2 className="text-2xl font-bold mb-3">Error Loading Chart</h2>
          <p className="mb-2 text-red-300">{error}</p>
          <p className="mb-6 text-gray-300">There was a problem with the data or chart initialization.</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => { setError(null); fetchData(selectedAsset); }}
              className="px-5 py-3 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 transition duration-150 shadow-md"
            >
              Try Again
            </button>
            <button 
              onClick={() => setError(null)}
              className="px-5 py-3 bg-gray-700 text-white rounded-md font-semibold hover:bg-gray-600 transition duration-150 shadow-md"
            >
              Dismiss Error
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col">
      <div className="bg-gray-800 p-4 shadow-md flex flex-wrap gap-4 items-center z-20">
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 transition shadow-sm flex items-center gap-2"
          >
            {assetDisplayName(selectedAsset)}
            <ChevronDown size={20} />
          </button>
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg z-30">
              {['nifty50', 'banknifty', 'sensex', 'reliance', 'hdfc'].map(asset => (
                <button
                  key={asset}
                  onClick={() => {
                    setSelectedAsset(asset);
                    setIsDropdownOpen(false);
                    clearTrendlines();
                  }}
                  className="w-full text-left px-4 py-2 text-white hover:bg-gray-600 transition"
                >
                  {assetDisplayName(asset)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-wrap gap-4">
          <button
            onClick={startDrawingTrendline}
            className={`px-4 py-2 rounded-md text-white font-semibold transition shadow-sm flex items-center gap-2 ${
              isDrawingTrendline
                ? 'bg-yellow-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
            disabled={isDrawingTrendline || isEditingTrendline}
          >
            <Pen size={20} />
            {isDrawingTrendline ? 'Select Points' : 'Draw Trendline'}
          </button>
          
          <button
            onClick={startEditingTrendline}
            className={`px-4 py-2 rounded-md text-white font-semibold transition shadow-sm flex items-center gap-2 ${
              isEditingTrendline
                ? 'bg-pink-500 cursor-not-allowed'
                : trendlineSeriesRef.current?.length > 0
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-gray-500 cursor-not-allowed'
            }`}
            disabled={isDrawingTrendline || isEditingTrendline || trendlineSeriesRef.current?.length === 0}
          >
            <Edit size={20} />
            Edit Trendline
          </button>
          
          <button
            onClick={clearTrendlines}
            className={`px-4 py-2 rounded-md text-white font-semibold transition shadow-sm flex items-center gap-2 ${
              trendlineSeriesRef.current?.length > 0
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-500 cursor-not-allowed'
            }`}
            disabled={trendlineSeriesRef.current?.length === 0}
          >
            <Trash2 size={20} />
            Clear All
          </button>
        </div>

        <button
          onClick={() => fetchData(selectedAsset)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition shadow-sm flex items-center gap-2"
        >
          <RefreshCw size={20} />
          Refresh Data
        </button>
      </div>

      <div ref={chartContainerRef} className="w-full h-full relative" />

      {(isDrawingTrendline || isEditingTrendline) && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 flex gap-4">
          <div className="bg-gray-800 px-4 py-2 rounded-md shadow-lg border border-gray-700 flex items-center gap-4">
            <p className={`${isDrawingTrendline ? 'text-yellow-400' : 'text-pink-400'} text-center font-medium`}>
              {isDrawingTrendline && `Click on the chart to select ${firstPoint ? 'second' : 'first'} point`}
              {isEditingTrendline && 'Click on the chart to set new endpoint for the selected trendline'}
            </p>
            <button
              onClick={cancelAction}
              className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-30">
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-white text-lg font-semibold">Loading {assetDisplayName(selectedAsset)} Data</p>
            <p className="text-gray-400 mt-2">Please wait while we fetch the latest market data</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NiftyChart;