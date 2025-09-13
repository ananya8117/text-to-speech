"use client";
import { useEffect, useState } from "react";

export default function AudioVisualizer({ 
  gradientFrom = "indigo-500", 
  gradientTo = "purple-600", 
  isActive = true,
  size = "medium",
  showWave = false 
}) {
  const [bars, setBars] = useState([]);
  
  const sizeClasses = {
    small: { height: "h-8", barWidth: "w-1", gap: "gap-1" },
    medium: { height: "h-16", barWidth: "w-2", gap: "gap-2" },
    large: { height: "h-24", barWidth: "w-3", gap: "gap-3" }
  };

  const currentSize = sizeClasses[size] || sizeClasses.medium;

  useEffect(() => {
    const numBars = showWave ? 12 : 8;
    const newBars = Array.from({ length: numBars }, (_, i) => ({
      id: i,
      height: Math.random() * 60 + 20,
      animationDelay: i * 0.1
    }));
    setBars(newBars);

    if (isActive) {
      const interval = setInterval(() => {
        setBars(prev => prev.map(bar => ({
          ...bar,
          height: Math.random() * 60 + 20
        })));
      }, 300);
      return () => clearInterval(interval);
    }
  }, [isActive, showWave]);

  if (showWave) {
    return (
      <div className={`flex justify-center items-center ${currentSize.height} relative overflow-hidden`}>
        {/* Animated wave background */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 200 50" preserveAspectRatio="none">
            <path
              className={`fill-gradient-to-r from-${gradientFrom} to-${gradientTo}`}
              d="M0,25 Q50,5 100,25 T200,25 V50 H0 Z"
            >
              <animateTransform
                attributeName="transform"
                attributeType="XML"
                type="translate"
                values="0,0;-200,0;0,0"
                dur="4s"
                repeatCount="indefinite"
              />
            </path>
          </svg>
        </div>
        
        {/* Audio bars */}
        <div className={`flex justify-center items-end ${currentSize.gap} z-10`}>
          {bars.map((bar) => (
            <div
              key={bar.id}
              className={`${currentSize.barWidth} bg-gradient-to-t from-${gradientFrom} to-${gradientTo} rounded-full transition-all duration-300 ease-in-out`}
              style={{
                height: isActive ? `${bar.height}%` : '20%',
                animationDelay: `${bar.animationDelay}s`
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex justify-center items-center ${currentSize.height} relative`}>
      {/* Pulsing background circle */}
      <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-${gradientFrom}/20 to-${gradientTo}/20 animate-pulse`} />
      
      {/* Audio bars */}
      <div className={`flex justify-center items-end ${currentSize.gap} z-10`}>
        {bars.map((bar) => (
          <div
            key={bar.id}
            className={`${currentSize.barWidth} bg-gradient-to-t from-${gradientFrom} via-${gradientFrom} to-${gradientTo} rounded-full shadow-lg transition-all duration-300 ease-in-out`}
            style={{
              height: isActive ? `${bar.height}%` : '20%',
              animationDelay: `${bar.animationDelay}s`,
              boxShadow: `0 0 10px rgba(99, 102, 241, 0.3)`
            }}
          />
        ))}
      </div>
      
      {/* Center pulse indicator */}
      {isActive && (
        <div className={`absolute inset-0 flex items-center justify-center`}>
          <div className={`w-3 h-3 bg-${gradientFrom} rounded-full animate-ping opacity-75`} />
        </div>
      )}
    </div>
  );
}
