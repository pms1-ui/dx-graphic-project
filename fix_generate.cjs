const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const ai = new GoogleGenAI\(\{ apiKey: currentKey \}\);\s*const outputs: GeneratedImage\[\] = \[\];\s*for \(let i = 0; i < imagesPerShot; i\+\+\) \{/;

const replacement = `const ai = new GoogleGenAI({ apiKey: currentKey });
        const BATCH_SIZE = 4;

        for (let i = 0; i < count; i += BATCH_SIZE) {
          const batchPromises = [];
          const currentBatchSize = Math.min(BATCH_SIZE, count - i);

          for (let j = 0; j < currentBatchSize; j++) {`;

code = code.replace(regex, replacement);

// We need to also add imagesPerShot logic inside the prompt if it's graphic tab
let promptFixGraphic = `[업로드된 상품 이미지 목록]: 총 \${images.length}장\\n이 이미지들에 있는 패션 아이템/상품을 정확히 인식하고, 가장 완성도 높은 화보(룩북) 컷으로 렌더링하세요. 상품의 디테일과 특징이 왜곡되지 않아야 합니다.\`;`;
let promptFixGraphicRepl = promptFixGraphic + `\n            if (!isConcept && imagesPerShot > 1) {\n              prompt += \`\\n요청 사항: 한 장의 이미지 안에 \${imagesPerShot}개의 분할된 컷을 자연스럽게 배열해주세요.\`;\n            }`;
code = code.replace(promptFixGraphic, promptFixGraphicRepl);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed loop');
