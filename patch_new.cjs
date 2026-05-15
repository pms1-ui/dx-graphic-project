const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. ImageSize default
code = code.replace(/useState<ImageSize>\('1K'\)/, "useState<ImageSize>('2K')");

// 2. Active Tab & Concept states
code = code.replace(
  /const \[bgImages, setBgImages\] = useState<UploadedImage\[\]>\(\[\]\);/,
  `const [bgImages, setBgImages] = useState<UploadedImage[]>([]);
  const [conceptRefImages, setConceptRefImages] = useState<UploadedImage[]>([]);
  const [conceptObjImages, setConceptObjImages] = useState<UploadedImage[]>([]);
  const [activeTab, setActiveTab] = useState<'graphic' | 'concept'>('graphic');`
);

// 3. openSections state
code = code.replace(
  /background: false\n\s*\}\);/,
  `background: false,
    conceptReference: true,
    conceptObject: false
  });`
);

// 4. Input Refs
code = code.replace(
  /const bgInputRef = useRef<HTMLInputElement>\(null\);/,
  `const bgInputRef = useRef<HTMLInputElement>(null);
  const conceptRefInputRef = useRef<HTMLInputElement>(null);
  const conceptObjInputRef = useRef<HTMLInputElement>(null);`
);

// 5. processFiles target type
code = code.replace(
  /target: 'garment' \| 'reference' \| 'background' = 'garment'/,
  "target: 'garment' | 'reference' | 'background' | 'conceptReference' | 'conceptObject' = 'garment'"
);

// 6. processFiles limit check
code = code.replace(
  /if \(target === 'background' && bgImages\.length \+ newFiles\.length > 5\) \{\s*setError\("배경 이미지는 최대 5개까지만 업로드할 수 있습니다\."\);\s*return;\s*\}/,
  `if (target === 'background' && bgImages.length + newFiles.length > 5) {
      setError("배경 이미지는 최대 5개까지만 업로드할 수 있습니다.");
      return;
    }
    if (target === 'conceptReference' && conceptRefImages.length + newFiles.length > 5) {
      setError("레퍼런스 이미지는 최대 5개까지만 업로드할 수 있습니다.");
      return;
    }
    if (target === 'conceptObject' && conceptObjImages.length + newFiles.length > 5) {
      setError("오브젝트 이미지는 최대 5개까지만 업로드할 수 있습니다.");
      return;
    }`
);

// 7. processFiles update state
code = code.replace(
  /\} else if \(target === 'background'\) \{\s*setBgImages\(prev => \[\.\.\.prev, \.\.\.processedFiles\]\);\s*\} else \{/,
  `} else if (target === 'background') {
      setBgImages(prev => [...prev, ...processedFiles]);
    } else if (target === 'conceptReference') {
      setConceptRefImages(prev => [...prev, ...processedFiles]);
    } else if (target === 'conceptObject') {
      setConceptObjImages(prev => [...prev, ...processedFiles]);
    } else {`
);

// 8. onDrop / removeImage handlers
code = code.replace(
  /const onDropBackground = \(e: React\.DragEvent\) => \{\s*e\.preventDefault\(\); e\.stopPropagation\(\);\s*processFiles\(e\.dataTransfer\.files, 'background'\);\s*\};/,
  `const onDropBackground = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    processFiles(e.dataTransfer.files, 'background');
  };
  const onDropConceptRef = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    processFiles(e.dataTransfer.files, 'conceptReference');
  };
  const onDropConceptObj = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    processFiles(e.dataTransfer.files, 'conceptObject');
  };`
);

code = code.replace(
  /removeImage = \(id: string, target: 'garment' \| 'reference' \| 'background' = 'garment'\) => \{/,
  `removeImage = (id: string, target: 'garment' | 'reference' | 'background' | 'conceptReference' | 'conceptObject' = 'garment') => {`
);

code = code.replace(
  /\} else if \(target === 'background'\) \{\s*setBgImages\(\(prev\) => prev\.filter\(\(img\) => img\.id !== id\)\);\s*\} else \{/,
  `} else if (target === 'background') {
      setBgImages((prev) => prev.filter((img) => img.id !== id));
    } else if (target === 'conceptReference') {
      setConceptRefImages((prev) => prev.filter((img) => img.id !== id));
    } else if (target === 'conceptObject') {
      setConceptObjImages((prev) => prev.filter((img) => img.id !== id));
    } else {`
);

// 9. generateImages update
let genLogic = `
    const isConcept = activeTab === 'concept';
    
    if (!isConcept && images.length === 0) {
      setError("상품 이미지를 최소 한 장 업로드해주세요.");
      return;
    }
    if (isConcept && conceptRefImages.length === 0) {
      setError("레퍼런스 이미지를 최소 한 장 업로드해주세요.");
      return;
    }
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    const simulationInterval = setInterval(() => {
      setProgress(p => Math.min(p + 5, 90));
    }, 500);

    try {
      if (modelType === 'gemini-3-pro-image-preview') {
        const ai = new GoogleGenAI({ apiKey: currentKey });
        const outputs: GeneratedImage[] = [];

        for (let i = 0; i < imagesPerShot; i++) {
          let prompt = '';
          const parts: any[] = [];

          if (isConcept) {
            prompt = \`[레퍼런스 이미지 목록]: 총 \${conceptRefImages.length}장\\n이 이미지들의 무드와 컨셉, 배경 느낌을 바탕으로 새로운 이미지를 생성하세요.\`;
            if (customPrompt) {
              prompt += \`\\n[기본 요청 사항]: \${customPrompt}\`;
            }
            conceptRefImages.forEach(img => {
              parts.push({ inlineData: { data: img.base64, mimeType: img.file.type } });
            });
            if (conceptObjImages.length > 0) {
              prompt += \`\\n[오브젝트 이미지 목록]: 업로드된 오브젝트(소품, 상품 등)를 이미지 내에 자연스럽게 배치하세요.\`;
              conceptObjImages.forEach(img => {
                parts.push({ inlineData: { data: img.base64, mimeType: img.file.type } });
              });
            }
          } else {
            prompt = \`[업로드된 상품 이미지 목록]: 총 \${images.length}장\\n이 이미지들에 있는 패션 아이템/상품을 정확히 인식하고, 가장 완성도 높은 화보(룩북) 컷으로 렌더링하세요. 상품의 디테일과 특징이 왜곡되지 않아야 합니다.\`;
            if (customPrompt) {
              prompt += \`\\n[기본 요청 사항 - 이 지침을 반드시 최우선으로 따를 것]: \${customPrompt}\`;
            }
            if (refModelImages.length > 0) {
              prompt += \`\\n주의: 최대 5개의 인물 예시 이미지가 제공되었습니다. 새롭게 만들어지는 모델의 체형과 외모(얼굴, 머리스타일 등)는 오직 이 예시 이미지들의 모델을 최우선으로 반영하여 통일성 있게 생성하세요.\`;
            }
            images.forEach(img => {
              parts.push({ inlineData: { data: img.base64, mimeType: img.file.type } });
            });
            refModelImages.forEach(img => {
              parts.push({ inlineData: { data: img.base64, mimeType: img.file.type } });
            });
            if (bgImages.length > 0) {
              prompt += \`\\n[배경 및 감도 필수 지침]: 추가로 제공된 컨셉 배경 이미지들이 있습니다. 새롭게 만들어지는 화보의 배경, 채도, 감도, 조명 등 전체적인 무드와 톤앤매너는 반드시 이 배경 이미지들의 느낌을 최우선으로 반영하여 생성하세요.\`;
              bgImages.forEach(img => {
                parts.push({ inlineData: { data: img.base64, mimeType: img.file.type } });
              });
            }
          }
`;
code = code.replace(
  /if \(images\.length === 0\) \{\s*setError\("상품 이미지\(누끼컷 등\)를 최소 한 장 업로드해주세요\."\);\s*return;\s*\}[\s\S]*?(?=const mappedRatio =)/,
  genLogic
);

// 10. Header update (설정 완료 -> 입력 완료)
code = code.replace(
  /<p className="text-sm font-medium text-purple-600 mt-0\.5">설정 완료<\/p>/,
  '<p className={`text-sm font-medium mt-0.5 ${customPrompt ? \'text-purple-600\' : \'text-gray-400\'}`}>{customPrompt ? \'입력 완료\' : \'미입력\'}</p>'
);

// 11. Add Tabs logic and Concept elements
// We will insert tab bar right after "<!-- Left Column -->"
let tabBar = `
        <div className="xl:col-span-4 flex flex-col gap-8 relative pb-32 xl:pb-0">
          
          <div className="bg-white rounded-full p-2 border border-gray-200 flex mb-2 shadow-sm">
            <button
              onClick={() => setActiveTab('graphic')}
              className={\`flex-1 py-3 rounded-full text-base font-bold transition-all \${
                activeTab === 'graphic' ? 'bg-[#1A1A1A] text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }\`}
            >
              Graphic
            </button>
            <button
              onClick={() => setActiveTab('concept')}
              className={\`flex-1 py-3 rounded-full text-base font-bold transition-all \${
                activeTab === 'concept' ? 'bg-[#1A1A1A] text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }\`}
            >
              Concept
            </button>
          </div>
`;
code = code.replace(/<div className="xl:col-span-4 flex flex-col gap-8 relative pb-32 xl:pb-0">/, tabBar);

// Wrap existing sections with {activeTab === 'graphic' && ( ... )}
// Concept should have Config + ConceptReference + ConceptObject

let graphicStart = code.indexOf(`{/* Garment Upload Section */}`);
let graphicEnd = code.indexOf(`{/* Sticky Floating Generate Button */}`);
let graphicParts = code.substring(graphicStart, graphicEnd);

// Replace Graphic with `{activeTab === 'graphic' && ( <> ... </> )} {activeTab === 'concept' && ( <> ... </> )}`
// Note: Config section should be outside so it's shared? 
// No, user said: "생성 튜닝 / 레퍼런스 / 오브젝트 이런 순서로 되면 되고, 생성 튜닝은 Graphic 페이지랑 옵션들 똑같을거고"
// Which means Config is FIRST in Concept tab! But in Graphic tab, it's SECOND (between Garment and Reference).
// So it's best to keep Config shared. Let's make Config first for BOTH?
// Actually in current app, Config is first. Let's check config's position.
// It says "Core Configuration Section" then "Garment Upload Section". So Config IS already first in Graphic tab!
// Wait! Let me check the order.

// Let's create a separate script to insert the Concept UI below config.
fs.writeFileSync('src/App.tsx', code);
