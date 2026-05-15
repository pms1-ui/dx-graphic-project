const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Hide "한 장에 포함할 이미지 수" in concept tab
code = code.replace(
  /\{\/\* Images Per Shot \*\/\}\s*<div className="space-y-4">\s*<label className="text-sm font-bold text-gray-700 block">한 장에 포함/m,
  `{activeTab === 'graphic' && (
              <>
            {/* Images Per Shot */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 block">한 장에 포함`
);
code = code.replace(
  /<span className="text-gray-500 font-medium">컷을 분할 배열하여 한 장에 담습니다\.<\/span>\s*<\/div>\s*<\/div>/m,
  `<span className="text-gray-500 font-medium">컷을 분할 배열하여 한 장에 담습니다.</span>
              </div>
            </div>
            </>
            )}`
);

// 2. generateImages - Password check
code = code.replace(
  /const generateImages = async \(\) => \{/,
  `const generateImages = async () => {
    if (count >= 11) {
      const pwd = window.prompt("생성 수량이 11개 이상입니다. 비밀번호를 입력해주세요.");
      if (pwd !== "Childy20251!") {
        if (pwd !== null) {
          alert("비밀번호가 일치하지 않습니다.");
        }
        return;
      }
    }`
);

// 3. "오브젝트" -> "오브젝트 (선택)"
code = code.replace(
  /<h2 className="text-\[1\.1rem\] font-bold text-gray-800">오브젝트<\/h2>/g,
  `<h2 className="text-[1.1rem] font-bold text-gray-800">오브젝트 (선택)</h2>`
);

// 4 & 5. Floating button text & disabled state logic update
code = code.replace(
  /disabled=\{isGenerating \|\| images\.length === 0\}/,
  "disabled={isGenerating || (activeTab === 'graphic' && images.length === 0) || (activeTab === 'concept' && conceptRefImages.length === 0)}"
);

code = code.replace(
  /isGenerating \|\| images\.length === 0\n\s*\? 'bg-gray-100 text-gray-400 cursor-not-allowed'/,
  "isGenerating || (activeTab === 'graphic' && images.length === 0) || (activeTab === 'concept' && conceptRefImages.length === 0)\n                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'"
);

code = code.replace(
  /\( activeTab === 'graphic' && images\.length === 0 \)/, // Just in case
  "(activeTab === 'graphic' && images.length === 0)"
);

code = code.replace(
  /\{\s*isGenerating \? \([\s\S]*?\) : \(\s*'모델 컷 생성 시작하기'\s*\)\s*\}/,
  `{isGenerating ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    병렬 생성 중... ({results.length} / {count})
                  </>
                ) : (
                  activeTab === 'concept' ? '컨셉 배경 생성 시작하기' : '모델 컷 생성 시작하기'
                )}`
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched');
