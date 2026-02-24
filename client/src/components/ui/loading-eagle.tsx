interface LoadingEagleProps {
  className?: string;
}

export default function LoadingEagle({ className = "w-16 h-16" }: LoadingEagleProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg 
        viewBox="0 0 300 220" 
        className="w-full h-full eagle-flying"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Eagle Body - Brown */}
        <ellipse cx="120" cy="140" rx="25" ry="35" fill="#8B4513"/>
        <ellipse cx="120" cy="135" rx="20" ry="28" fill="#A0522D"/>
        
        {/* Eagle Head - White/Light Blue */}
        <ellipse cx="105" cy="110" rx="18" ry="22" fill="#E6F3FF"/>
        <ellipse cx="108" cy="108" rx="12" ry="16" fill="#FFFFFF"/>
        
        {/* Head feather details */}
        <path d="M 95 95 Q 90 85 95 80 Q 105 85 100 95 Z" fill="#B0E0E6"/>
        <path d="M 105 90 Q 100 80 105 75 Q 115 80 110 90 Z" fill="#B0E0E6"/>
        <path d="M 115 95 Q 110 85 115 80 Q 125 85 120 95 Z" fill="#B0E0E6"/>
        
        {/* Beak - Yellow/Orange */}
        <path d="M 87 110 Q 75 105 70 110 Q 75 115 87 118 Q 82 113 87 110 Z" fill="#FFD700"/>
        <path d="M 87 110 Q 82 110 80 113 Q 82 115 87 115 Z" fill="#FFA500"/>
        
        {/* Eagle Eye */}
        <circle cx="95" cy="108" r="3" fill="#000000"/>
        <circle cx="94" cy="107" r="1" fill="#FFFFFF"/>
        
        {/* Left Wing - Detailed Feathers */}
        <g className="animate-wing-left origin-[120_130]">
          {/* Primary wing structure */}
          <path d="M 120 130 Q 60 100 20 120 Q 15 140 25 160 Q 40 170 60 165 Q 85 155 120 145 Z" fill="#654321"/>
          <path d="M 110 135 Q 65 110 30 125 Q 25 145 35 165 Q 50 175 70 170 Q 90 160 110 150 Z" fill="#8B4513"/>
          
          {/* Individual feathers - Primary */}
          <path d="M 35 135 Q 25 130 15 140 Q 20 150 30 155 Q 35 145 35 135 Z" fill="#5D4E37"/>
          <path d="M 45 130 Q 35 125 25 135 Q 30 145 40 150 Q 45 140 45 130 Z" fill="#6B5B47"/>
          <path d="M 55 125 Q 45 120 35 130 Q 40 140 50 145 Q 55 135 55 125 Z" fill="#5D4E37"/>
          <path d="M 65 120 Q 55 115 45 125 Q 50 135 60 140 Q 65 130 65 120 Z" fill="#6B5B47"/>
          <path d="M 75 118 Q 65 113 55 123 Q 60 133 70 138 Q 75 128 75 118 Z" fill="#5D4E37"/>
          
          {/* Secondary feathers */}
          <path d="M 50 145 Q 40 140 30 150 Q 35 160 45 165 Q 50 155 50 145 Z" fill="#A0522D"/>
          <path d="M 60 140 Q 50 135 40 145 Q 45 155 55 160 Q 60 150 60 140 Z" fill="#CD853F"/>
          <path d="M 70 138 Q 60 133 50 143 Q 55 153 65 158 Q 70 148 70 138 Z" fill="#A0522D"/>
          <path d="M 80 135 Q 70 130 60 140 Q 65 150 75 155 Q 80 145 80 135 Z" fill="#CD853F"/>
          
          {/* Wing tip feathers */}
          <path d="M 25 155 Q 15 150 10 160 Q 15 170 25 175 Q 30 165 25 155 Z" fill="#4A4A4A"/>
          <path d="M 35 165 Q 25 160 20 170 Q 25 180 35 185 Q 40 175 35 165 Z" fill="#4A4A4A"/>
        </g>
        
        {/* Right Wing - Detailed Feathers */}
        <g className="animate-wing-right origin-[120_130]">
          {/* Primary wing structure */}
          <path d="M 120 130 Q 180 100 220 120 Q 225 140 215 160 Q 200 170 180 165 Q 155 155 120 145 Z" fill="#654321"/>
          <path d="M 130 135 Q 175 110 210 125 Q 215 145 205 165 Q 190 175 170 170 Q 150 160 130 150 Z" fill="#8B4513"/>
          
          {/* Individual feathers - Primary */}
          <path d="M 205 135 Q 215 130 225 140 Q 220 150 210 155 Q 205 145 205 135 Z" fill="#5D4E37"/>
          <path d="M 195 130 Q 205 125 215 135 Q 210 145 200 150 Q 195 140 195 130 Z" fill="#6B5B47"/>
          <path d="M 185 125 Q 195 120 205 130 Q 200 140 190 145 Q 185 135 185 125 Z" fill="#5D4E37"/>
          <path d="M 175 120 Q 185 115 195 125 Q 190 135 180 140 Q 175 130 175 120 Z" fill="#6B5B47"/>
          <path d="M 165 118 Q 175 113 185 123 Q 180 133 170 138 Q 165 128 165 118 Z" fill="#5D4E37"/>
          
          {/* Secondary feathers */}
          <path d="M 190 145 Q 200 140 210 150 Q 205 160 195 165 Q 190 155 190 145 Z" fill="#A0522D"/>
          <path d="M 180 140 Q 190 135 200 145 Q 195 155 185 160 Q 180 150 180 140 Z" fill="#CD853F"/>
          <path d="M 170 138 Q 180 133 190 143 Q 185 153 175 158 Q 170 148 170 138 Z" fill="#A0522D"/>
          <path d="M 160 135 Q 170 130 180 140 Q 175 150 165 155 Q 160 145 160 135 Z" fill="#CD853F"/>
          
          {/* Wing tip feathers */}
          <path d="M 215 155 Q 225 150 230 160 Q 225 170 215 175 Q 210 165 215 155 Z" fill="#4A4A4A"/>
          <path d="M 205 165 Q 215 160 220 170 Q 215 180 205 185 Q 200 175 205 165 Z" fill="#4A4A4A"/>
        </g>
        
        {/* Tail Feathers - Fanned and detailed */}
        <path d="M 115 175 Q 110 195 115 210 Q 120 215 125 210 Q 120 195 125 175 Z" fill="#4A4A4A"/>
        <path d="M 110 175 Q 105 195 110 210 Q 115 215 120 210 Q 115 195 120 175 Z" fill="#5D4E37"/>
        <path d="M 125 175 Q 120 195 125 210 Q 130 215 135 210 Q 130 195 135 175 Z" fill="#4A4A4A"/>
        <path d="M 130 175 Q 125 195 130 210 Q 135 215 140 210 Q 135 195 140 175 Z" fill="#5D4E37"/>
        
        {/* Tail feather tips - Light blue/white */}
        <ellipse cx="115" cy="212" rx="3" ry="2" fill="#B0E0E6"/>
        <ellipse cx="125" cy="212" rx="3" ry="2" fill="#E6F3FF"/>
        <ellipse cx="135" cy="212" rx="3" ry="2" fill="#B0E0E6"/>
        
        {/* Talons - Extended in flight */}
        <g>
          <ellipse cx="108" cy="170" rx="3" ry="6" fill="#FFD700"/>
          <ellipse cx="115" cy="170" rx="3" ry="6" fill="#FFD700"/>
          <ellipse cx="125" cy="170" rx="3" ry="6" fill="#FFD700"/>
          <ellipse cx="132" cy="170" rx="3" ry="6" fill="#FFD700"/>
          
          {/* Talon claws */}
          <path d="M 106 176 L 104 182 M 110 176 L 112 182" stroke="#CC8400" strokeWidth="1.5" fill="none"/>
          <path d="M 113 176 L 111 182 M 117 176 L 119 182" stroke="#CC8400" strokeWidth="1.5" fill="none"/>
          <path d="M 123 176 L 121 182 M 127 176 L 129 182" stroke="#CC8400" strokeWidth="1.5" fill="none"/>
          <path d="M 130 176 L 128 182 M 134 176 L 136 182" stroke="#CC8400" strokeWidth="1.5" fill="none"/>
        </g>
      </svg>
    </div>
  );
}