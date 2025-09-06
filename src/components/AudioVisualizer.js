"use client";
export default function AudioVisualizer() {
  return (
    <div className="flex justify-center items-end gap-2 h-16">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="w-2 bg-indigo-500 rounded animate-bounceBar"
          style={{ animationDelay: `${i * 0.15}s` }}
        ></div>
      ))}
    </div>
  );
}
