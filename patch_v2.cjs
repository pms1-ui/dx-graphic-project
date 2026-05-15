const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Setup Password Modal States
const addState = `  const [activeTab, setActiveTab] = useState<'graphic' | 'concept'>('graphic');
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdInput, setPwdInput] = useState("");
  const [pwdError, setPwdError] = useState("");`;
code = code.replace(/const \[activeTab, setActiveTab\] = useState\<'graphic' \| 'concept'\>\('graphic'\);/, addState);

// 2. Setup Tab Switching Logic (Reset everything)
const handleTabSwitch = `  const handleTabSwitch = (tab: 'graphic' | 'concept') => {
    setActiveTab(tab);
    setImages([]);
    setRefModelImages([]);
    setBgImages([]);
    setConceptRefImages([]);
    setConceptObjImages([]);
    setCustomPrompt("");
    setResults([]);
    setProgress(0);
    setError(null);
    setCount(4);
    setImagesPerShot(1);
    setAspectRatio('2:3');
    setImageSize('2K');
  };`;
code = code.replace(/const removeImage =/, handleTabSwitch + '\n\n  const removeImage =');

// 3. Replace setActiveTab calls with handleTabSwitch
code = code.replace(/onClick=\{\(\) => setActiveTab\('graphic'\)\}/, "onClick={() => handleTabSwitch('graphic')}");
code = code.replace(/onClick=\{\(\) => setActiveTab\('concept'\)\}/, "onClick={() => handleTabSwitch('concept')}");

// 4. Update generateImages to trigger password modal, and move logic to executeGeneration
code = code.replace(
  /const generateImages = async \(\) => \{\s*if \(count >= 11\) \{\s*const pwd = window\.prompt\("생성 수량이 11개 이상입니다\. 비밀번호를 입력해주세요\."\);\s*if \(pwd !== "Childy20251!"\) \{\s*if \(pwd !== null\) \{\s*alert\("비밀번호가 일치하지 않습니다\."\);\s*\}\s*return;\s*\}\s*\}/,
  `const executeGeneration = async () => {`
);

// We need to add the generateImages wrapper
const genWrapper = `  const generateImages = () => {
    const currentKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!hasApiKey && !currentKey) {
      setError("API 키가 감지되지 않았습니다. 상단 노란색 버튼을 눌러 선택하거나 Secrets 메뉴를 확인해주세요.");
      handleOpenKeySelector();
      return;
    }

    const isConcept = activeTab === 'concept';
    
    if (!isConcept && images.length === 0) {
      setError("상품 이미지를 최소 한 장 업로드해주세요.");
      return;
    }
    if (isConcept && conceptRefImages.length === 0) {
      setError("레퍼런스 이미지를 최소 한 장 업로드해주세요.");
      return;
    }

    if (count >= 11) {
      setShowPwdModal(true);
      setPwdError("");
      setPwdInput("");
      return;
    }
    executeGeneration();
  };

  const submitPassword = () => {
    if (pwdInput === "Childy20251!") {
      setShowPwdModal(false);
      executeGeneration();
    } else {
      setPwdError("비밀번호가 일치하지 않습니다.");
    }
  };
`;
code = code.replace(/const executeGeneration = async \(\) => \{/, genWrapper + '\n  const executeGeneration = async () => {');

// Remove redundant checks and variables in executeGeneration
code = code.replace(
/const currentKey = process\.env\.API_KEY \|\| process\.env\.GEMINI_API_KEY;\s*if \(!hasApiKey && !currentKey\) \{\s*setError\("API 키가 감지되지 않았습니다\. 상단 노란색 버튼을 눌러 선택하거나 Secrets 메뉴를 확인해주세요\."\);\s*handleOpenKeySelector\(\);\s*\}\s*const isConcept = activeTab === 'concept';\s*if \(!isConcept && images\.length === 0\) \{\s*setError\("상품 이미지를 최소 한 장 업로드해주세요\."\);\s*return;\s*\}\s*if \(isConcept && conceptRefImages\.length === 0\) \{\s*setError\("레퍼런스 이미지를 최소 한 장 업로드해주세요\."\);\s*return;\s*\}/,
  "const currentKey = process.env.API_KEY || process.env.GEMINI_API_KEY;"
);

// 5. Inject Password Modal into the JSX
const modalJSX = `{/* Password Modal */}
      <AnimatePresence>
        {showPwdModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm"
            >
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">비밀번호 입력</h3>
                <p className="text-sm text-gray-500 mb-6">생성 수량이 11개 이상입니다. 비밀번호를 입력해주세요.</p>
                
                <input
                  type="password"
                  value={pwdInput}
                  onChange={(e) => setPwdInput(e.target.value)}
                  placeholder="비밀번호"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mb-2 focus:outline-none focus:border-[#1A1A1A]"
                  onKeyDown={(e) => { if (e.key === 'Enter') submitPassword(); }}
                />
                {pwdError && <p className="text-sm text-red-500 font-medium mb-4">{pwdError}</p>}
                
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => setShowPwdModal(false)}
                    className="px-4 py-2 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={submitPassword}
                    className="px-4 py-2 rounded-xl bg-[#1A1A1A] text-white font-medium hover:bg-gray-800 transition-colors"
                  >
                    확인
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>`;

code = code.replace(/(<div className="min-h-screen pb-24 selection:bg-orange-100">)/, `$1\n      ${modalJSX}`);

fs.writeFileSync('src/App.tsx', code);
console.log('Patch V2 done');
