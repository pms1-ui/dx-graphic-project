import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Download, 
  Loader2, 
  LayoutGrid,
  Shirt,
  User,
  Settings2,
  Maximize2,
  DownloadCloud,
  Plus,
  Key,
  Check,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';

// --- Global Declarations ---
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

// --- Types ---
type AspectRatio = '1:1' | '3:2' | '2:3' | '16:9' | '9:16';
type ImageSize = '1K' | '2K' | '4K';
type ModelType = 'nanobanana-2' | 'nanobanana-pro';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  base64: string;
}

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
}

// --- Constants ---
const SHOT_VARIATIONS = [
  { pose: "자연스럽게 서서 카메라를 응시하는 포즈", shot: "전신 샷", distance: "far" },
  { pose: "자신감 있는 자세로 주머니에 손을 넣은 포즈", shot: "미디엄 샷", distance: "medium" },
  { pose: "약간 옆으로 돌아 서서 먼 곳을 바라보는 포즈", shot: "측면 전신 샷", distance: "far" },
  { pose: "카메라를 향해 걸어오는 역동적인 포즈", shot: "역동적인 샷", distance: "medium" },
  { pose: "의자나 스툴에 앉아 있는 편안한 포즈", shot: "릴렉스 포즈", distance: "medium" },
  { pose: "소매나 옷깃을 다듬는 디테일 중심의 포즈", shot: "클로즈업 샷", distance: "close" },
  { pose: "어깨 너머로 뒤를 돌아보는 뒷모습 포즈", shot: "후면 샷", distance: "medium" },
  { pose: "낮은 각도에서 촬영한 당당한 전신 샷", shot: "로우 앵글 샷", distance: "far" },
];

const apiAspectRatioMap: Record<AspectRatio, string> = {
  '1:1': '1:1',
  '3:2': '4:3', 
  '2:3': '3:4',
  '16:9': '16:9',
  '9:16': '9:16'
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- Main Component ---
export default function App() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [refModelImages, setRefModelImages] = useState<UploadedImage[]>([]);
  const [bgImages, setBgImages] = useState<UploadedImage[]>([]);
  const [conceptRefImages, setConceptRefImages] = useState<UploadedImage[]>([]);
  const [conceptObjImages, setConceptObjImages] = useState<UploadedImage[]>([]);
    const [floorFrontImages, setFloorFrontImages] = useState<UploadedImage[]>([]);
  const [floorBackImages, setFloorBackImages] = useState<UploadedImage[]>([]);
  const [floorLogoImages, setFloorLogoImages] = useState<UploadedImage[]>([]);
  const [floorDetailImages, setFloorDetailImages] = useState<UploadedImage[]>([]);
  const [activeTab, setActiveTab] = useState<'graphic' | 'concept' | 'floor'>('graphic');
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdInput, setPwdInput] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('2:3');
  const [imageSize, setImageSize] = useState<ImageSize>('2K');
  const [modelType, setModelType] = useState<ModelType>('nanobanana-2');
  const [imagesPerShot, setImagesPerShot] = useState<number>(1);
  const [count, setCount] = useState<number>(4);
  const [gazeVariation, setGazeVariation] = useState<number>(5);
  const [poseVariation, setPoseVariation] = useState<number>(5);
  const [viewVariation, setViewVariation] = useState<number>(5);
  // Floor specific state
  const [floorStyle, setFloorStyle] = useState<'hanger' | 'folded' | 'spread'>('hanger');
  const [floorBgColor, setFloorBgColor] = useState<string>('#F3F4F6');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  
  const [openSections, setOpenSections] = useState({
    garment: true,
    config: false,
    reference: false,
    background: false,
    conceptReference: true,
    conceptObject: false,
    floorFront: true,
    floorBack: true,
    floorLogo: true,
    floorDetail: true
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  const [selectedImageFullscreen, setSelectedImageFullscreen] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const refModelInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const conceptRefInputRef = useRef<HTMLInputElement>(null);
  const conceptObjInputRef = useRef<HTMLInputElement>(null);
  
  const floorFrontInputRef = useRef<HTMLInputElement>(null);
  const floorBackInputRef = useRef<HTMLInputElement>(null);
  const floorLogoInputRef = useRef<HTMLInputElement>(null);
  const floorDetailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      const envKeyExists = !!(process.env.API_KEY || process.env.GEMINI_API_KEY);
      let dialogKeySelected = false;
      if (window.aistudio?.hasSelectedApiKey) {
        dialogKeySelected = await window.aistudio.hasSelectedApiKey();
      }
      setHasApiKey(envKeyExists || dialogKeySelected);
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    } else {
      setHasApiKey(true);
    }
  };

  const processFiles = async (files: FileList | null, target: 'garment' | 'reference' | 'background' | 'conceptReference' | 'conceptObject' | 'floorFront' | 'floorBack' | 'floorLogo' | 'floorDetail' = 'garment') => {
    if (!files) return;
    const newFiles = Array.from(files);
    
    if (target === 'reference' && refModelImages.length + newFiles.length > 5) {
      setError("모델 이미지는 최대 5개까지만 업로드할 수 있습니다.");
      return;
    }
    if (target === 'background' && bgImages.length + newFiles.length > 5) {
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
    }
    if (target === 'floorFront' && floorFrontImages.length + newFiles.length > 2) {
      setError("정면 이미지는 최대 2개까지만 업로드할 수 있습니다.");
      return;
    }
    if (target === 'floorBack' && floorBackImages.length + newFiles.length > 2) {
      setError("후면 이미지는 최대 2개까지만 업로드할 수 있습니다.");
      return;
    }
    if (target === 'floorLogo' && floorLogoImages.length + newFiles.length > 2) {
      setError("로고 이미지는 최대 2개까지만 업로드할 수 있습니다.");
      return;
    }
    if (target === 'floorDetail' && floorDetailImages.length + newFiles.length > 2) {
      setError("세부 디테일 이미지는 최대 2개까지만 업로드할 수 있습니다.");
      return;
    }
    
    const processedFiles = await Promise.all(
      newFiles.map(async (file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        base64: await fileToBase64(file),
      }))
    );

    if (target === 'reference') {
      setRefModelImages(prev => [...prev, ...processedFiles]);
    } else if (target === 'background') {
      setBgImages(prev => [...prev, ...processedFiles]);
    } else if (target === 'conceptReference') {
      setConceptRefImages(prev => [...prev, ...processedFiles]);
    } else if (target === 'conceptObject') {
      setConceptObjImages(prev => [...prev, ...processedFiles]);
    } else if (target === 'floorFront') {
      setFloorFrontImages(prev => [...prev, ...processedFiles]);
    } else if (target === 'floorBack') {
      setFloorBackImages(prev => [...prev, ...processedFiles]);
    } else if (target === 'floorLogo') {
      setFloorLogoImages(prev => [...prev, ...processedFiles]);
    } else if (target === 'floorDetail') {
      setFloorDetailImages(prev => [...prev, ...processedFiles]);
    } else {
      setImages(prev => [...prev, ...processedFiles]);
    }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const onDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  
  const onDropGarment = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    processFiles(e.dataTransfer.files, 'garment');
  };

  const onDropRefModel = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    processFiles(e.dataTransfer.files, 'reference');
  };

  const onDropBackground = (e: React.DragEvent) => {
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
  };
  
  const onDropFloorFront = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    processFiles(e.dataTransfer.files, 'floorFront');
  };
  const onDropFloorBack = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    processFiles(e.dataTransfer.files, 'floorBack');
  };
  const onDropFloorLogo = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    processFiles(e.dataTransfer.files, 'floorLogo');
  };
  const onDropFloorDetail = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    processFiles(e.dataTransfer.files, 'floorDetail');
  };

    const handleTabSwitch = (tab: 'graphic' | 'concept' | 'floor') => {
    setActiveTab(tab);
    setImages([]);
    setRefModelImages([]);
    setBgImages([]);
    setConceptRefImages([]);
    setConceptObjImages([]);
    setFloorFrontImages([]);
    setFloorBackImages([]);
    setFloorLogoImages([]);
    setFloorDetailImages([]);
    setCustomPrompt("");
    setResults([]);
    setProgress(0);
    setError(null);
    setCount(4);
    setImagesPerShot(1);
    setAspectRatio('2:3');
    setImageSize('2K');
    setGazeVariation(5);
    setPoseVariation(5);
    setViewVariation(5);
    setFloorStyle('hanger');
    setFloorBgColor('#F3F4F6');
    
    setOpenSections({
      garment: true,
      config: false,
      reference: false,
      background: false,
      conceptReference: true,
      conceptObject: false,
      floorFront: true,
      floorBack: true,
      floorLogo: true,
      floorDetail: true
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (refModelInputRef.current) refModelInputRef.current.value = "";
    if (bgInputRef.current) bgInputRef.current.value = "";
    if (conceptRefInputRef.current) conceptRefInputRef.current.value = "";
    if (conceptObjInputRef.current) conceptObjInputRef.current.value = "";
    if (floorFrontInputRef.current) floorFrontInputRef.current.value = "";
    if (floorBackInputRef.current) floorBackInputRef.current.value = "";
    if (floorLogoInputRef.current) floorLogoInputRef.current.value = "";
    if (floorDetailInputRef.current) floorDetailInputRef.current.value = "";
  };

  const removeImage = (id: string, target: 'garment' | 'reference' | 'background' | 'conceptReference' | 'conceptObject' | 'floorFront' | 'floorBack' | 'floorLogo' | 'floorDetail' = 'garment') => {
    if (target === 'reference') {
      setRefModelImages((prev) => prev.filter((img) => img.id !== id));
    } else if (target === 'background') {
      setBgImages((prev) => prev.filter((img) => img.id !== id));
    } else if (target === 'conceptReference') {
      setConceptRefImages((prev) => prev.filter((img) => img.id !== id));
    } else if (target === 'conceptObject') {
      setConceptObjImages((prev) => prev.filter((img) => img.id !== id));
    } else if (target === 'floorFront') {
      setFloorFrontImages((prev) => prev.filter((img) => img.id !== id));
    } else if (target === 'floorBack') {
      setFloorBackImages((prev) => prev.filter((img) => img.id !== id));
    } else if (target === 'floorLogo') {
      setFloorLogoImages((prev) => prev.filter((img) => img.id !== id));
    } else if (target === 'floorDetail') {
      setFloorDetailImages((prev) => prev.filter((img) => img.id !== id));
    } else {
      setImages((prev) => prev.filter((img) => img.id !== id));
    }
  };

    const generateImages = () => {
    const currentKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!hasApiKey && !currentKey) {
      setError("API 키가 감지되지 않았습니다. 상단 노란색 버튼을 눌러 선택하거나 Secrets 메뉴를 확인해주세요.");
      handleOpenKeySelector();
      return;
    }

    const isConcept = activeTab === 'concept';
    const isFloor = activeTab === 'floor';
    
    if (isFloor) {
      if (floorFrontImages.length === 0 && floorBackImages.length === 0 && floorLogoImages.length === 0 && floorDetailImages.length === 0) {
        setError("의류 이미지를 최소 한 장 업로드해주세요.");
        return;
      }
    } else if (isConcept) {
      if (conceptRefImages.length === 0) {
        setError("레퍼런스 이미지를 최소 한 장 업로드해주세요.");
        return;
      }
    } else {
      if (images.length === 0) {
        setError("상품 이미지를 최소 한 장 업로드해주세요.");
        return;
      }
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

  const executeGeneration = async () => {
    const isConcept = activeTab === 'concept';
    const isFloor = activeTab === 'floor';
    const currentKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    const simulationInterval = setInterval(() => {
      setProgress(p => Math.min(p + 5, 90));
    }, 500);

    try {
      const ai = new GoogleGenAI({ apiKey: currentKey });
      
      // 1단계: 배치 생성 제어 - 한 번에 2장씩 병렬로 생성
      const BATCH_SIZE = 2;
      for (let i = 0; i < count; i += BATCH_SIZE) {
        const batchPromises = [];
        const currentBatchSize = Math.min(BATCH_SIZE, count - i);

        for (let j = 0; j < currentBatchSize; j++) {
          let prompt = '';
          const parts: any[] = [];
          
          let gazePrompt = '';
          let posePrompt = '';
          let viewPrompt = '';
          let layoutPrompt = '';
          
          if (imagesPerShot === 1) {
            layoutPrompt = `\\n[최우선 절대 원칙 - 단일 컷]: 이 이미지 안에는 오직 단 1개의 컷, 단 1명의 피사체/장면만 있어야 합니다. 화면 분할, 콜라주, 한 화면에 여러 번 등장하는 것 등 2개 이상의 컷이 포함되는 것은 절대로 금지합니다. 사용자의 어떤 추가 요청이 있더라도 이 원칙을 무조건 최우선으로 지키세요.`;
          } else {
            layoutPrompt = `\\n[최우선 절대 원칙 - 다중 컷 분할]: 이 이미지 안에는 반드시 서로 다른 구도나 컷이 콜라주/분할 형태로 정확히 ${imagesPerShot}개 포함되어야 합니다. 사용자의 어떤 추가 요청(기본 요청 사항)이 있더라도 이 숫자(${imagesPerShot} 컷)를 엄격하게 지키세요.`;
          }

          if (!isConcept && !isFloor) {
            if (gazeVariation <= 3) {
              gazePrompt = `\\n[시선 고정 지침]: 레퍼런스 이미지와 동일한 시선(응시 방향)을 엄격하게 유지하세요.`;
            } else if (gazeVariation <= 6) {
              gazePrompt = `\\n[시선 변주 지침]: 기존 시선 방향을 약간 비틀거나 변주(카메라 시선, 측면 시선 등)하여 자연스럽게 연출하세요.`;
            } else {
              const randomGazeOptions = ["카메라를 똑바로 응시하는 강렬한 시선", "왼쪽이나 오른쪽 먼 곳을 바라보는 시선", "아래쪽으로 시선을 깔아보는 시선", "어깨 너머로 뒤돌아보는 시선"];
              const randomGaze = randomGazeOptions[Math.floor(Math.random() * randomGazeOptions.length)];
              gazePrompt = `\\n[시선 변주 지침 (적극 적용)]: 이번 컷의 강제 시선 연출은 [${randomGaze}] 입니다. 기존 이미지가 바라보는 곳과 정반대가 되더라도 무조건 이 시선을 따라 다양하게 연출하세요.`;
            }

            if (poseVariation <= 3) {
              posePrompt = `\\n[자세 고정 지침]: 레퍼런스 원본 이미지의 체형 윤곽, 몸통 방향, 팔다리 자세를 그대로 유지하세요.`;
            } else if (poseVariation <= 6) {
              posePrompt = `\\n[자세 약한 변주 지침]: 기본 자세는 유지하되, 팔/다리 위치를 바꾸거나(예: 주머니에 손 넣기, 짝다리) 몸통을 살짝 돌리는 등 자연스럽게 변주하세요.`;
            } else {
              const randomPoseOptions = ["과감하게 옆으로 틀어 뒷모습이 약간 보이는 측면 포즈", "양 팔을 적극적으로 활용한 하이패션 포토 포즈", "의자/바닥에 앉거나 쪼그린 자세", "손으로 턱을 괴거나 머리를 만지는 역동적 포즈", "가슴을 펴고 정면을 향해 당당하게 걷는 포즈"];
              const randomPose = randomPoseOptions[Math.floor(Math.random() * randomPoseOptions.length)];
              posePrompt = `\\n[자세 파격 변주 지침 (매우 중요)]: 기존 포즈는 잊어버리세요. 이번 컷의 강제 자세 연출은 [${randomPose}] 입니다. 매 컷마다 프로페셔널하면서도 완전히 다른 자세(정면, 측면, 뒷면, 앉은 자세 등)가 나오도록 획기적으로 변주하세요.`;
            }
            
            if (viewVariation <= 3) {
              viewPrompt = `\\n[시점 고정 지침]: 기존 배경과 피사체가 어우러진 공간에서 동일한 스팟, 정확히 같은 카메라 앵글을 유지하여 촬영하세요.`;
            } else if (viewVariation <= 6) {
              viewPrompt = `\\n[시점 약한 변주 지침]: 동일한 공간 내에서 카메라의 앵글을 살짝 올리거나 내리거나, 조금 다른 각도에서 촬영한 구도로 연출하세요.`;
            } else {
              const randomViewOptions = ["하늘을 향해 올려다보는 듯한 과감한 로우 앵글", "피사체와 공간을 넓게 조망하는 하이 앵글/조감도 뷰", "공간의 일부와 피사체를 극도로 클로즈업한 뷰", "매 매우 먼 거리에서 공간 전체를 보여주는 딥 포커스 뷰", "바닥에 붙어서 올려다보듯 촬영한 극단적 로우 앵글"];
              const randomView = randomViewOptions[Math.floor(Math.random() * randomViewOptions.length)];
              viewPrompt = `\\n[시점 파격 변주 지침]: 이번 컷의 강제 카메라 시점은 [${randomView}] 입니다. 동일한 공간 안에서 완전히 다른 스팟과 파격적인 앵글을 매 컷마다 새롭게 적용하세요.`;
            }
          }

          const garmentDetailPrompt = `\\n[의류 디테일 통합 지침]: 업로드된 이미지에는 옷의 전체 모습뿐만 아니라 특정 디테일(원단, 로고, 소매, 넥라인 등)을 확대한 이미지들도 포함되어 있을 수 있습니다. 임의로 옷의 형태나 패턴을 왜곡하지 마세요. 각 디테일 이미지가 옷의 어느 부위에 해당하는지 논리적으로 파악하여, 전체 의류에 자연스럽고 정확하게 통합해 렌더링해야 합니다. 제공된 디테일이 누락되거나 변형되지 않도록 완벽하게 합성하세요.`;

          if (isFloor) {
            const totalFloorImages = floorFrontImages.length + floorBackImages.length + floorLogoImages.length + floorDetailImages.length;
            prompt = `[업로드된 상품 이미지 목록]: 총 ${totalFloorImages}장\n이 이미지들에 있는 의류 아이템을 정확히 인식하여 상품 상세 페이지에 적합한 "바닥컷(Floor cut)" 형태로 렌더링하세요. 실제 의류가 깔끔하게 보이도록 해야 합니다.`;
            prompt += layoutPrompt;
            prompt += garmentDetailPrompt;
            
            if (floorStyle === 'hanger') {
              prompt += `\n[바닥컷 스타일]: 반드시 [옷걸이컷] 형태로 생성하세요. 옷걸이에 걸려 매끄럽게 떨어지는 형태의 컷이 되어야 합니다.`;
            } else if (floorStyle === 'folded') {
              prompt += `\n[바닥컷 스타일]: 반드시 [접힌 바닥컷] 형태로 생성하세요. 의류가 깔끔하게 잘 개어져 있는 단정한 컷이 되어야 합니다.`;
            } else if (floorStyle === 'spread') {
              prompt += `\n[바닥컷 스타일]: 반드시 [펼쳐진 바닥컷] 형태로 생성하세요. 의류 전체적인 모양이 잘 보이도록 예쁘게 쫙 펼쳐서 배치된 컷이어야 합니다.`;
            }

            prompt += `\n[배경 지침]: 배경은 지정된 단일 색상(Hex Color Code: ${floorBgColor})의 솔리드 컬러(단색)로 깔끔하게 처리하세요. 다른 배경 장식이나 요소는 최대한 배제하고 옷에만 집중되도록 하세요.`;

            if (customPrompt) {
              prompt += `\n[기본 요청 사항]: ${customPrompt}`;
            }

            if (floorFrontImages.length > 0) {
              parts.push({ text: `[정면 이미지] 다음은 의류의 정면 모습입니다.` });
              floorFrontImages.forEach(img => {
                parts.push({ inlineData: { data: img.base64, mimeType: img.file.type } });
              });
            }
            if (floorBackImages.length > 0) {
              parts.push({ text: `[후면 이미지] 다음은 의류의 후면 모습입니다.` });
              floorBackImages.forEach(img => {
                parts.push({ inlineData: { data: img.base64, mimeType: img.file.type } });
              });
            }
            if (floorLogoImages.length > 0) {
              parts.push({ text: `[로고 이미지] 다음은 의류의 로고 디테일입니다.` });
              floorLogoImages.forEach(img => {
                parts.push({ inlineData: { data: img.base64, mimeType: img.file.type } });
              });
            }
            if (floorDetailImages.length > 0) {
              parts.push({ text: `[세부 디테일 이미지] 다음은 원단, 소매, 넥라인 등 의류의 세부 디테일입니다.` });
              floorDetailImages.forEach(img => {
                parts.push({ inlineData: { data: img.base64, mimeType: img.file.type } });
              });
            }
          } else if (isConcept) {
            prompt = `[레퍼런스 이미지 목록]: 총 ${conceptRefImages.length}장\n이 이미지들의 무드와 컨셉, 배경 느낌을 바탕으로 새로운 이미지를 생성하세요.`;
            prompt += layoutPrompt;
            prompt += `\n[컨셉 생성 지침 - 단일 스팟 시점 변주]: 레퍼런스와 완벽히 동일한 장소(특정 스팟)에서 카메라가 살짝 다른 곳을 바라보고 찍은 듯한 1장의 사진을 렌더링하세요. 레퍼런스의 톤앤매너, 사진 스타일, 보정 느낌, 조명 등은 완벽하게 동일해야 합니다.`;

            if (customPrompt) {
              prompt += `\n[기본 요청 사항]: ${customPrompt}`;
            }
            conceptRefImages.forEach(img => {
              parts.push({ inlineData: { data: img.base64, mimeType: img.file.type } });
            });
            if (conceptObjImages.length > 0) {
              prompt += `\n[오브젝트 이미지 목록]: 업로드된 오브젝트(소품, 상품 등)를 이미지 내에 자연스럽게 배치하세요.`;
              conceptObjImages.forEach(img => {
                parts.push({ inlineData: { data: img.base64, mimeType: img.file.type } });
              });
            }
          } else {
            prompt = `[업로드된 상품 이미지 목록]: 총 ${images.length}장\n이 이미지들에 있는 패션 아이템/상품을 정확히 인식하고, 가장 완성도 높은 화보(룩북) 컷으로 렌더링하세요. 상품의 디테일과 특징이 왜곡되지 않아야 합니다.`;
            prompt += layoutPrompt;
            prompt += garmentDetailPrompt;
            prompt += gazePrompt;
            prompt += posePrompt;
            prompt += viewPrompt;
            
            if (customPrompt) {
              prompt += `\n[기본 요청 사항 - 이 지침을 반드시 최우선으로 따를 것]: ${customPrompt}`;
            }
            if (refModelImages.length > 0) {
              prompt += `\n주의: 최대 5개의 인물 예시 이미지가 제공되었습니다. 새롭게 만들어지는 모델의 체형과 외모(얼굴, 머리스타일 등)는 오직 이 예시 이미지들의 모델을 최우선으로 반영하여 통일성 있게 생성하세요.`;
            }
            images.forEach(img => {
              parts.push({ inlineData: { data: img.base64, mimeType: img.file.type } });
            });
            refModelImages.forEach(img => {
              parts.push({ inlineData: { data: img.base64, mimeType: img.file.type } });
            });
            if (bgImages.length > 0) {
              prompt += `\n[배경 및 감도 필수 지침]: 추가로 제공된 컨셉 배경 이미지들이 있습니다. 새롭게 만들어지는 화보의 배경, 채도, 감도, 조명 등 전체적인 무드와 톤앤매너는 반드시 이 배경 이미지들의 느낌을 최우선으로 반영하여 생성하세요.`;
              bgImages.forEach(img => {
                parts.push({ inlineData: { data: img.base64, mimeType: img.file.type } });
              });
            }
          }
          
          parts.push({ text: prompt });

          const mappedRatio = apiAspectRatioMap[aspectRatio];

          // 맵핑되는 API 모델 (nano 모델들은 gemini-3-pro-image-preview를 사용하도록 맵핑)
          const apiModel = 'gemini-3-pro-image-preview';

          const reqPromise = ai.models.generateContent({
            model: apiModel,
            contents: { parts },
            config: {
              imageConfig: {
                aspectRatio: mappedRatio as any,
                imageSize: imageSize
              }
            }
          }).then(response => {
            const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
            if (imagePart?.inlineData?.data) {
              const newImage = {
                id: Math.random().toString(36).substr(2, 9),
                url: `data:image/png;base64,${imagePart.inlineData.data}`,
                prompt: isFloor ? '생성된 바닥컷' : (isConcept ? '생성된 컨셉 배경' : '생성된 모델 컷')
              };
              
              setResults(prev => {
                const updated = [...prev, newImage];
                setProgress((updated.length / count) * 100);
                return updated;
              });
            } else {
              throw new Error("이미지를 반환받지 못했습니다.");
            }
          });

          batchPromises.push(reqPromise);
        }

        await Promise.all(batchPromises);

        if (i + BATCH_SIZE < count) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg = err.message || "생성 중 오류가 발생했습니다. 다시 시도해주세요.";
      
      // Parse specific permission error
      if (typeof errorMsg === 'string' && errorMsg.includes('403') && errorMsg.includes('permission')) {
        errorMsg = `해당 API 키에 '${modelType}' 모델에 대한 접근 권한이 없습니다. 다른 모델을 선택하거나, 권한이 부여된 프로젝트의 API 키인지 확인하세요.`;
      } else if (typeof errorMsg === 'object') {
        errorMsg = JSON.stringify(errorMsg, null, 2);
      }
      
      setError(errorMsg);
      setShowErrorModal(true); // 에러 발생 시 모달 표시
    } finally {
      clearInterval(simulationInterval);
      setIsGenerating(false);
    }
  };

  const downloadSingle = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.png`;
    link.click();
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    results.forEach((img, index) => {
      const base64Data = img.url.split(',')[1];
      zip.file(`model_shot_${index + 1}.png`, base64Data, { base64: true });
    });
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'fashion_model_shots.zip';
    link.click();
  };

  return (
    <div className="min-h-screen pb-24 selection:bg-orange-100">
      {/* Password Modal */}
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
      </AnimatePresence>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-5">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#1A1A1A] rounded-2xl flex items-center justify-center shadow-md">
              <Shirt className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#1A1A1A]">AI Graphic</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            {(process.env.API_KEY || process.env.GEMINI_API_KEY) && (
              <div className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-200">
                <Check size={14} />
                API 키 작동중
              </div>
            )}
            {!hasApiKey && !(process.env.API_KEY || process.env.GEMINI_API_KEY) && (
              <button 
                onClick={handleOpenKeySelector}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 text-amber-700 rounded-full text-sm font-bold hover:bg-amber-100 transition-all border border-amber-200"
              >
                <Key size={16} />
                API 키 선택
              </button>
            )}
            {results.length > 0 && (
              <button 
                onClick={downloadAll}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#1A1A1A] text-white rounded-full text-sm font-bold hover:bg-gray-800 transition-all shadow-xl shadow-black/10"
              >
                <DownloadCloud size={18} />
                전체 다운로드
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-8 mt-10 grid grid-cols-1 xl:grid-cols-12 gap-10">
        
        {/* Left Column: Extensive Controls */}
        
        <div className="xl:col-span-4 flex flex-col gap-8 relative pb-32 xl:pb-0">
          
          <div className="bg-white rounded-full p-2 border border-gray-200 flex mb-2 shadow-sm">
            <button
              onClick={() => handleTabSwitch('graphic')}
              className={`flex-1 py-3 rounded-full text-base font-bold transition-all ${
                activeTab === 'graphic' ? 'bg-[#1A1A1A] text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Graphic
            </button>
            <button
              onClick={() => handleTabSwitch('concept')}
              className={`flex-1 py-3 rounded-full text-base font-bold transition-all ${
                activeTab === 'concept' ? 'bg-[#1A1A1A] text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Concept
            </button>
            <button
              onClick={() => handleTabSwitch('floor')}
              className={`flex-1 py-3 rounded-full text-base font-bold transition-all ${
                activeTab === 'floor' ? 'bg-[#1A1A1A] text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Floor
            </button>
          </div>

          
          {/* Core Configuration Section */}
          <section className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 overflow-hidden">
            <button 
              onClick={() => toggleSection('config')}
              className="w-full flex items-center justify-between p-6 sm:p-8 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <Settings2 size={24} className="text-purple-500" />
                </div>
                <div className="text-left">
                  <h2 className="text-[1.1rem] font-bold text-gray-800">생성 튜닝</h2>
                  <p className={`text-sm font-medium mt-0.5 ${customPrompt ? 'text-purple-600' : 'text-gray-400'}`}>{customPrompt ? '입력 완료' : '미입력'}</p>
                </div>
              </div>
              <div className="text-gray-400">
                {openSections.config ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
              </div>
            </button>

            <AnimatePresence>
              {openSections.config && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 sm:p-8 pt-0 space-y-8 border-t border-gray-100/60 mt-2">
            {/* Custom Prompt */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 block">기본 요청 사항</label>
              <textarea 
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full p-4 bg-gray-50/80 rounded-2xl text-base border border-gray-200 focus:border-[#1A1A1A] focus:bg-white transition-all outline-none resize-none h-28 font-medium"
              />
            </div>

            {/* Model Type */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 block">사용 인공지능 모델</label>
              <div className="grid grid-cols-2 gap-3">
                {(['nanobanana-2', 'nanobanana-pro'] as ModelType[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setModelType(m)}
                    className={`py-3.5 rounded-xl text-sm font-bold transition-all border-2 break-keep ${
                      modelType === m 
                        ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-lg shadow-black/10' 
                        : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {m === 'nanobanana-pro' ? '나노바나나 프로' : '나노바나나 2'}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 block">이미지 비율(가로 x 세로)</label>
              <div className="grid grid-cols-5 gap-2">
                {(['1:1', '3:2', '2:3', '16:9', '9:16'] as AspectRatio[]).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-3.5 rounded-xl text-sm font-bold transition-all border-2 ${
                      aspectRatio === ratio 
                        ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-lg shadow-black/10' 
                        : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Resolution */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 block">출력 화질 (해상도)</label>
              <div className="grid grid-cols-3 gap-2">
                {(['1K', '2K', '4K'] as ImageSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setImageSize(size)}
                    className={`py-3.5 rounded-xl text-sm font-bold transition-all border-2 ${
                      imageSize === size 
                        ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-lg shadow-black/10' 
                        : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold text-gray-400 leading-relaxed break-keep">
                * 1K는 약 100만 화소(1024x1024), 2K는 약 400만 화소, 4K는 약 1600만 화소급의 초고해상도를 의미합니다. (1K도 HD(720p)보다 조금 더 선명하며, 2K는 일반적인 FHD(1080p)를 능가합니다.)
              </p>
            </div>

            {activeTab === 'graphic' && (
              <>
            {/* Images Per Shot */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 block">한 장에 포함할 이미지 수 (1~6개)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="number"
                  min="1"
                  max="6"
                  value={imagesPerShot}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) {
                      setImagesPerShot(val > 6 ? 6 : (val < 1 ? 1 : val));
                    } else {
                      setImagesPerShot(1);
                    }
                  }}
                  className="w-24 p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-center text-lg font-bold focus:border-[#1A1A1A] focus:bg-white transition-all outline-none"
                />
                <span className="text-gray-500 font-medium">컷을 분할 배열하여 한 장에 담습니다.</span>
              </div>
            </div>
            </>
            )}

            {activeTab === 'floor' && (
              <>
                <div className="space-y-4">
                  <label className="text-sm font-bold text-gray-700 block">바닥컷 스타일</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'hanger', label: '옷걸이컷' },
                      { id: 'folded', label: '접힌 바닥컷' },
                      { id: 'spread', label: '펼쳐진 바닥컷' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setFloorStyle(opt.id as 'hanger' | 'folded' | 'spread')}
                        className={`py-3.5 rounded-xl text-sm font-bold transition-all border-2 break-keep ${
                          floorStyle === opt.id
                            ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-lg shadow-black/10'
                            : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-bold text-gray-700 block">배경 색상</label>
                  <div className="flex flex-wrap gap-3 items-center">
                    {[
                      '#FFFFFF', '#F3F4F6', '#E5E7EB', '#D1D5DB', 
                      '#FCA5A5', '#FCD34D', '#86EFAC', '#9A3412', '#3B82F6', '#1E3A8A'
                    ].map(color => (
                      <button
                        key={color}
                        onClick={() => setFloorBgColor(color)}
                        className={`w-10 h-10 rounded-full border-2 transition-transform ${
                          floorBgColor.toUpperCase() === color.toUpperCase() ? 'border-[#1A1A1A] scale-110 shadow-md' : 'border-gray-200 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                    <div className="h-10 w-px bg-gray-200 mx-1"></div>
                    <div className="relative">
                      <input
                        type="color"
                        value={floorBgColor}
                        onChange={(e) => setFloorBgColor(e.target.value)}
                        className="w-10 h-10 rounded-full cursor-pointer appearance-none p-0 border-0 overflow-hidden bg-transparent border-2 border-gray-200 inline-block align-middle shadow-sm hover:scale-105 transition-transform"
                        style={{ backgroundColor: floorBgColor }}
                      />
                      <span className="absolute left-1/2 -top-8 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 pointer-events-none transition-opacity font-mono">
                        {floorBgColor}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Count */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700 block">생성 수량 (1~99개)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="number"
                  min="1"
                  max="99"
                  value={count}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) {
                      setCount(val > 99 ? 99 : (val < 1 ? 1 : val));
                    } else {
                      setCount(1); // fallback empty to 1 conceptually but keeping value state aligned
                    }
                  }}
                  className="w-24 p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-center text-lg font-bold focus:border-[#1A1A1A] focus:bg-white transition-all outline-none"
                />
                <span className="text-gray-500 font-medium">장의 이미지를 순서대로 생성합니다.</span>
              </div>
            </div>

            {/* Gaze/Pose Variation (Graphic Mode Only) */}
            {activeTab === 'graphic' && (
            <>
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-700">시선의 변화 정도</span>
                  <div className="group relative">
                    <Info size={16} className="text-gray-300 cursor-help" />
                    <div className="absolute top-1/2 left-full ml-2 w-64 text-left -translate-y-1/2 p-3 bg-gray-800 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl font-medium leading-relaxed whitespace-pre-line">
                      0~3 (고정): 기존 래퍼런스/입력 이미지의 시선 방향 지침.
                      4~6 (약한 변주): 기본 자세를 바탕으로 방향/포즈 약간 변주.
                      7~10 (파격적 변주): 무작위로 여러 시선 뷰를 다채롭게 생성.
                    </div>
                  </div>
                </div>
                <span className="text-[#1A1A1A] font-bold text-sm">{gazeVariation}</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="10" 
                step="1" 
                value={gazeVariation} 
                onChange={(e) => setGazeVariation(parseInt(e.target.value))}
                className="w-full accent-[#1A1A1A] cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 font-medium">
                <span>기준 시선 유지</span>
                <span>다양한 시선</span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-700">자세의 변화 정도</span>
                  <div className="group relative">
                    <Info size={16} className="text-gray-300 cursor-help" />
                    <div className="absolute top-1/2 left-full ml-2 w-64 text-left -translate-y-1/2 p-3 bg-gray-800 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl font-medium leading-relaxed whitespace-pre-line">
                      0~3 (고정): 기존 래퍼런스 몸통/팔다리 방향을 매우 엄격하게 유지.
                      4~6 (약한 변주): 팔, 다리, 몸 방향을 살짝만 자연스럽게 변주.
                      7~10 (파격적 변주): 무작위로 주저앉거나 뒷모습 등 완전히 새로운 포즈.
                    </div>
                  </div>
                </div>
                <span className="text-[#1A1A1A] font-bold text-sm">{poseVariation}</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="10" 
                step="1" 
                value={poseVariation} 
                onChange={(e) => setPoseVariation(parseInt(e.target.value))}
                className="w-full accent-[#1A1A1A] cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 font-medium">
                <span>기준 자세 유지</span>
                <span>다양한 변주</span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-700">시점의 변화 정도</span>
                  <div className="group relative">
                    <Info size={16} className="text-gray-300 cursor-help" />
                    <div className="absolute top-1/2 left-full ml-2 w-64 text-left -translate-y-1/2 p-3 bg-gray-800 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl font-medium leading-relaxed whitespace-pre-line">
                      1~3 (고정): 동일한 장소에서 같은 구도와 앵글 유지.
                      4~6 (약한 변주): 동일한 공간 안에서 약간 다른 각도로 촬영.
                      7~10 (파격적 변주): 파격적으로 다양한 스팟과 카메라 앵글로 촬영.
                    </div>
                  </div>
                </div>
                <span className="text-[#1A1A1A] font-bold text-sm">{viewVariation}</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="1" 
                value={viewVariation} 
                onChange={(e) => setViewVariation(parseInt(e.target.value))}
                className="w-full accent-[#1A1A1A] cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 font-medium">
                <span>동일 시점/앵글</span>
                <span>다양한 앵글</span>
              </div>
            </div>
            </>
            )}


                  </div>
                </motion.div>
              )}
            </AnimatePresence>
</section>
                    {activeTab === 'graphic' && (
            <>
{/* Garment Upload Section */}
          <section className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 overflow-hidden">
            <button 
              onClick={() => toggleSection('garment')}
              className="w-full flex items-center justify-between p-6 sm:p-8 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <Upload size={24} className="text-orange-500" />
                </div>
                <div className="text-left">
                  <h2 className="text-[1.1rem] font-bold text-gray-800">상품 이미지</h2>
                  <p className={`text-sm font-medium mt-0.5 ${images.length > 0 ? 'text-green-500' : 'text-gray-400'}`}>
                    {images.length > 0 ? `입력 완료 (${images.length}장)` : '입력 전'}
                  </p>
                </div>
              </div>
              <div className="text-gray-400">
                 {openSections.garment ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
              </div>
            </button>

            <AnimatePresence>
              {openSections.garment && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 sm:p-8 pt-0 border-t border-gray-100/60 mt-2">
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={onDragOver}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDrop={onDropGarment}
              className="border-[2.5px] border-dashed border-gray-200 rounded-[1.5rem] p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-[#1A1A1A] hover:bg-gray-50/50 transition-all group relative bg-white"
            >
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center group-hover:scale-105 transition-transform group-hover:bg-white group-hover:shadow-sm">
                <ImageIcon className="text-gray-400 w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-gray-700">이곳을 클릭하거나 이미지를 드롭하세요</p>
                <p className="text-sm text-gray-400 mt-2 font-medium">여러 장 스캔본 업로드 권장</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => processFiles(e.target.files, 'garment')} 
                multiple 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            <div className="mt-6 space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence>
                {images.map((img) => (
                  <motion.div 
                    key={img.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center gap-4 p-3 bg-gray-50/80 rounded-2xl border border-gray-100"
                  >
                    <img src={img.preview} alt="preview" className="w-14 h-14 rounded-xl object-cover border border-gray-200 bg-white" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate text-gray-700">{img.file.name}</p>
                    </div>
                    <button 
                      onClick={() => removeImage(img.id, 'garment')}
                      className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
</section>
            </>
          )}

          {activeTab === 'graphic' && (
            <>
          {/* Reference Models Upload Section */}
          <section className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 overflow-hidden">
            <button 
              onClick={() => toggleSection('reference')}
              className="w-full flex items-center justify-between p-6 sm:p-8 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <User size={24} className="text-blue-500" />
                </div>
                <div className="text-left flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[1.1rem] font-bold text-gray-800">모델 이미지</h2>
                    <div className="group relative -mt-0.5 hidden sm:block">
                      <Info size={16} className="text-gray-300 cursor-help" />
                      <div className="absolute top-1/2 left-full ml-2 w-48 text-left -translate-y-1/2 p-2.5 bg-gray-800 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl font-medium leading-relaxed">
                        원하는 모델 룩북 사진을 등록하면 해당 얼굴과 체형을 기반으로 생성합니다.
                      </div>
                    </div>
                  </div>
                  <p className={`text-sm font-medium mt-0.5 ${refModelImages.length > 0 ? 'text-blue-500' : 'text-gray-400'}`}>
                    {refModelImages.length > 0 ? `입력 완료 (${refModelImages.length}장)` : '입력 전'}
                  </p>
                </div>
              </div>
              <div className="text-gray-400">
                {openSections.reference ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
              </div>
            </button>

            <AnimatePresence>
              {openSections.reference && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 sm:p-8 pt-0 border-t border-gray-100/60 mt-2">
            <div 
              onDragOver={onDragOver}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDrop={onDropRefModel}
            >
              {refModelImages.length < 5 && (
                <div 
                  onClick={() => refModelInputRef.current?.click()}
                  className="border-[2px] border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-all mb-4"
                >
                  <Plus size={24} className="text-gray-400" />
                  <p className="text-sm text-gray-500 font-bold">인물 사진 드롭 또는 클릭</p>
                  <input 
                    type="file" 
                    ref={refModelInputRef} 
                    onChange={(e) => processFiles(e.target.files, 'reference')} 
                    multiple
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              )}

              <div className="grid grid-cols-5 gap-3">
                <AnimatePresence>
                  {refModelImages.map(img => (
                    <motion.div
                      key={img.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200"
                    >
                      <img src={img.preview} className="w-full h-full object-cover" alt="ref mode" />
                      <button 
                        onClick={() => removeImage(img.id, 'reference')}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
</section>

          {/* Background Upload Section */}
          <section className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 overflow-hidden">
            <button 
              onClick={() => toggleSection('background')}
              className="w-full flex items-center justify-between p-6 sm:p-8 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center shrink-0">
                  <ImageIcon size={24} className="text-pink-500" />
                </div>
                <div className="text-left flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[1.1rem] font-bold text-gray-800">컨셉 배경</h2>
                    <div className="group relative -mt-0.5 hidden sm:block">
                      <Info size={16} className="text-gray-300 cursor-help" />
                      <div className="absolute top-1/2 left-full ml-2 w-48 text-left -translate-y-1/2 p-2.5 bg-gray-800 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl font-medium leading-relaxed">
                        원하는 배경, 조명, 톤앤매너의 레퍼런스를 업로드 하세요. 해당 무드를 기반으로 렌더링 됩니다.
                      </div>
                    </div>
                  </div>
                  <p className={`text-sm font-medium mt-0.5 ${bgImages.length > 0 ? 'text-pink-500' : 'text-gray-400'}`}>
                    {bgImages.length > 0 ? `입력 완료 (${bgImages.length}장)` : '입력 전'}
                  </p>
                </div>
              </div>
              <div className="text-gray-400">
                {openSections.background ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
              </div>
            </button>

            <AnimatePresence>
              {openSections.background && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 sm:p-8 pt-0 border-t border-gray-100/60 mt-2">
            <div 
              onDragOver={onDragOver}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDrop={onDropBackground}
            >
              {bgImages.length < 5 && (
                <div 
                  onClick={() => bgInputRef.current?.click()}
                  className="border-[2px] border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-all mb-4"
                >
                  <Plus size={24} className="text-gray-400" />
                  <p className="text-sm text-gray-500 font-bold">배경 사진 드롭 또는 클릭</p>
                  <input 
                    type="file" 
                    ref={bgInputRef} 
                    onChange={(e) => processFiles(e.target.files, 'background')} 
                    multiple
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              )}

              <div className="grid grid-cols-5 gap-3">
                <AnimatePresence>
                  {bgImages.map(img => (
                    <motion.div
                      key={img.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200"
                    >
                      <img src={img.preview} className="w-full h-full object-cover" alt="ref mode" />
                      <button 
                        onClick={() => removeImage(img.id, 'background')}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
</section>
                      </>
          )}

          {/* Concept Upload Sections */}
          {activeTab === 'concept' && (
            <>
              {/* Concept Reference Upload */}
              <section className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 overflow-hidden">
                <button 
                  onClick={() => toggleSection('conceptReference')}
                  className="w-full flex items-center justify-between p-6 sm:p-8 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                      <ImageIcon size={24} className="text-indigo-500" />
                    </div>
                    <div className="text-left flex flex-col items-start">
                      <h2 className="text-[1.1rem] font-bold text-gray-800">레퍼런스</h2>
                      <p className={`text-sm font-medium mt-0.5 ${conceptRefImages.length > 0 ? 'text-indigo-500' : 'text-gray-400'}`}>
                        {conceptRefImages.length > 0 ? `입력 완료 (${conceptRefImages.length}장)` : '입력 전'}
                      </p>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {openSections.conceptReference ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </button>

                <AnimatePresence>
                  {openSections.conceptReference && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 sm:p-8 pt-0 border-t border-gray-100/60 mt-2">
                        <div 
                          onDragOver={onDragOver}
                          onDragEnter={onDragEnter}
                          onDragLeave={onDragLeave}
                          onDrop={onDropConceptRef}
                        >
                          {conceptRefImages.length < 5 && (
                            <div 
                              onClick={() => conceptRefInputRef.current?.click()}
                              className="border-[2px] border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 hover:border-indigo-300 transition-all mb-4"
                            >
                              <Plus size={24} className="text-gray-400" />
                              <p className="text-sm text-gray-500 font-bold">레퍼런스 사진 드롭 또는 클릭</p>
                              <input 
                                type="file" 
                                ref={conceptRefInputRef} 
                                onChange={(e) => processFiles(e.target.files, 'conceptReference')} 
                                multiple
                                accept="image/*" 
                                className="hidden" 
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-5 gap-3">
                            <AnimatePresence>
                              {conceptRefImages.map(img => (
                                <motion.div
                                  key={img.id}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  className="aspect-[3/4] rounded-lg overflow-hidden relative group"
                                >
                                  <img src={img.preview} alt="upload" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setSelectedImageFullscreen(img.preview); }}
                                      className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors"
                                    >
                                      <Plus size={16} />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); removeImage(img.id, 'conceptReference'); }}
                                      className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full text-white backdrop-blur-sm transition-colors"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* Concept Object Upload */}
              <section className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 overflow-hidden">
                <button 
                  onClick={() => toggleSection('conceptObject')}
                  className="w-full flex items-center justify-between p-6 sm:p-8 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                      <User size={24} className="text-orange-500" />
                    </div>
                    <div className="text-left flex flex-col items-start">
                      <h2 className="text-[1.1rem] font-bold text-gray-800">오브젝트 (선택)</h2>
                      <p className={`text-sm font-medium mt-0.5 ${conceptObjImages.length > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                        {conceptObjImages.length > 0 ? `입력 완료 (${conceptObjImages.length}장)` : '입력 전'}
                      </p>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {openSections.conceptObject ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </button>

                <AnimatePresence>
                  {openSections.conceptObject && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 sm:p-8 pt-0 border-t border-gray-100/60 mt-2">
                        <div 
                          onDragOver={onDragOver}
                          onDragEnter={onDragEnter}
                          onDragLeave={onDragLeave}
                          onDrop={onDropConceptObj}
                        >
                          {conceptObjImages.length < 5 && (
                            <div 
                              onClick={() => conceptObjInputRef.current?.click()}
                              className="border-[2px] border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 hover:border-orange-300 transition-all mb-4"
                            >
                              <Plus size={24} className="text-gray-400" />
                              <p className="text-sm text-gray-500 font-bold">오브젝트 사진 드롭 또는 클릭</p>
                              <input 
                                type="file" 
                                ref={conceptObjInputRef} 
                                onChange={(e) => processFiles(e.target.files, 'conceptObject')} 
                                multiple
                                accept="image/*" 
                                className="hidden" 
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-5 gap-3">
                            <AnimatePresence>
                              {conceptObjImages.map(img => (
                                <motion.div
                                  key={img.id}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  className="aspect-[3/4] rounded-lg overflow-hidden relative group"
                                >
                                  <img src={img.preview} alt="upload" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setSelectedImageFullscreen(img.preview); }}
                                      className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-colors"
                                    >
                                      <Plus size={16} />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); removeImage(img.id, 'conceptObject'); }}
                                      className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full text-white backdrop-blur-sm transition-colors"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </>
          )}

          {/* Floor Upload Sections */}
          {activeTab === 'floor' && (
            <>
              {/* Floor Front Upload */}
              <section className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 overflow-hidden">
                <button 
                  onClick={() => toggleSection('floorFront')}
                  className="w-full flex items-center justify-between p-6 sm:p-8 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                      <ImageIcon size={24} className="text-orange-500" />
                    </div>
                    <div className="text-left flex flex-col items-start">
                      <h2 className="text-[1.1rem] font-bold text-gray-800">정면 이미지</h2>
                      <p className={`text-sm font-medium mt-0.5 ${floorFrontImages.length > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                        {floorFrontImages.length > 0 ? `입력 완료 (${floorFrontImages.length}장)` : '입력 전 (최대 2장)'}
                      </p>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {openSections.floorFront ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </button>

                <AnimatePresence>
                  {openSections.floorFront && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 sm:p-8 pt-0 border-t border-gray-100/60 mt-2">
                        <div 
                          onDragOver={onDragOver}
                          onDragEnter={onDragEnter}
                          onDragLeave={onDragLeave}
                          onDrop={onDropFloorFront}
                        >
                          {floorFrontImages.length < 2 && (
                            <div 
                              onClick={() => floorFrontInputRef.current?.click()}
                              className="border-[2px] border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 hover:border-orange-300 transition-all mb-4"
                            >
                              <Plus size={24} className="text-gray-400" />
                              <p className="text-sm text-gray-500 font-bold">정면 사진 드롭 또는 클릭</p>
                              <input 
                                type="file" 
                                ref={floorFrontInputRef} 
                                onChange={(e) => processFiles(e.target.files, 'floorFront')} 
                                multiple
                                accept="image/*" 
                                className="hidden" 
                              />
                            </div>
                          )}

                          <div className="space-y-4">
                            <AnimatePresence>
                              {floorFrontImages.map((img) => (
                                <motion.div
                                  key={img.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="relative group bg-gray-50 rounded-[1rem] p-3 pr-4 flex items-center gap-4 border border-gray-100/80 shadow-sm"
                                >
                                  <div className="relative w-20 h-20 rounded-xl overflow-hidden shadow-sm shrink-0 bg-white">
                                    <img src={img.preview} alt="uploaded" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => setSelectedImageFullscreen(img.preview)}>
                                      <Search size={20} className="text-white" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">{img.file.name}</p>
                                    <p className="text-xs text-gray-500 font-medium mt-0.5">{(img.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeImage(img.id, 'floorFront'); }}
                                    className="p-2.5 rounded-full bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* Floor Back Upload */}
              <section className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 overflow-hidden">
                <button 
                  onClick={() => toggleSection('floorBack')}
                  className="w-full flex items-center justify-between p-6 sm:p-8 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                      <ImageIcon size={24} className="text-orange-500" />
                    </div>
                    <div className="text-left flex flex-col items-start">
                      <h2 className="text-[1.1rem] font-bold text-gray-800">후면 이미지</h2>
                      <p className={`text-sm font-medium mt-0.5 ${floorBackImages.length > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                        {floorBackImages.length > 0 ? `입력 완료 (${floorBackImages.length}장)` : '입력 전 (최대 2장)'}
                      </p>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {openSections.floorBack ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </button>

                <AnimatePresence>
                  {openSections.floorBack && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 sm:p-8 pt-0 border-t border-gray-100/60 mt-2">
                        <div 
                          onDragOver={onDragOver}
                          onDragEnter={onDragEnter}
                          onDragLeave={onDragLeave}
                          onDrop={onDropFloorBack}
                        >
                          {floorBackImages.length < 2 && (
                            <div 
                              onClick={() => floorBackInputRef.current?.click()}
                              className="border-[2px] border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 hover:border-orange-300 transition-all mb-4"
                            >
                              <Plus size={24} className="text-gray-400" />
                              <p className="text-sm text-gray-500 font-bold">후면 사진 드롭 또는 클릭</p>
                              <input 
                                type="file" 
                                ref={floorBackInputRef} 
                                onChange={(e) => processFiles(e.target.files, 'floorBack')} 
                                multiple
                                accept="image/*" 
                                className="hidden" 
                              />
                            </div>
                          )}

                          <div className="space-y-4">
                            <AnimatePresence>
                              {floorBackImages.map((img) => (
                                <motion.div
                                  key={img.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="relative group bg-gray-50 rounded-[1rem] p-3 pr-4 flex items-center gap-4 border border-gray-100/80 shadow-sm"
                                >
                                  <div className="relative w-20 h-20 rounded-xl overflow-hidden shadow-sm shrink-0 bg-white">
                                    <img src={img.preview} alt="uploaded" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => setSelectedImageFullscreen(img.preview)}>
                                      <Search size={20} className="text-white" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">{img.file.name}</p>
                                    <p className="text-xs text-gray-500 font-medium mt-0.5">{(img.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeImage(img.id, 'floorBack'); }}
                                    className="p-2.5 rounded-full bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* Floor Logo Upload */}
              <section className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 overflow-hidden">
                <button 
                  onClick={() => toggleSection('floorLogo')}
                  className="w-full flex items-center justify-between p-6 sm:p-8 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                      <ImageIcon size={24} className="text-orange-500" />
                    </div>
                    <div className="text-left flex flex-col items-start">
                      <h2 className="text-[1.1rem] font-bold text-gray-800">로고 이미지</h2>
                      <p className={`text-sm font-medium mt-0.5 ${floorLogoImages.length > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                        {floorLogoImages.length > 0 ? `입력 완료 (${floorLogoImages.length}장)` : '입력 전 (최대 2장)'}
                      </p>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {openSections.floorLogo ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </button>

                <AnimatePresence>
                  {openSections.floorLogo && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 sm:p-8 pt-0 border-t border-gray-100/60 mt-2">
                        <div 
                          onDragOver={onDragOver}
                          onDragEnter={onDragEnter}
                          onDragLeave={onDragLeave}
                          onDrop={onDropFloorLogo}
                        >
                          {floorLogoImages.length < 2 && (
                            <div 
                              onClick={() => floorLogoInputRef.current?.click()}
                              className="border-[2px] border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 hover:border-orange-300 transition-all mb-4"
                            >
                              <Plus size={24} className="text-gray-400" />
                              <p className="text-sm text-gray-500 font-bold">로고 사진 드롭 또는 클릭</p>
                              <input 
                                type="file" 
                                ref={floorLogoInputRef} 
                                onChange={(e) => processFiles(e.target.files, 'floorLogo')} 
                                multiple
                                accept="image/*" 
                                className="hidden" 
                              />
                            </div>
                          )}

                          <div className="space-y-4">
                            <AnimatePresence>
                              {floorLogoImages.map((img) => (
                                <motion.div
                                  key={img.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="relative group bg-gray-50 rounded-[1rem] p-3 pr-4 flex items-center gap-4 border border-gray-100/80 shadow-sm"
                                >
                                  <div className="relative w-20 h-20 rounded-xl overflow-hidden shadow-sm shrink-0 bg-white">
                                    <img src={img.preview} alt="uploaded" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => setSelectedImageFullscreen(img.preview)}>
                                      <Search size={20} className="text-white" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">{img.file.name}</p>
                                    <p className="text-xs text-gray-500 font-medium mt-0.5">{(img.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeImage(img.id, 'floorLogo'); }}
                                    className="p-2.5 rounded-full bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* Floor Detail Upload */}
              <section className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 overflow-hidden">
                <button 
                  onClick={() => toggleSection('floorDetail')}
                  className="w-full flex items-center justify-between p-6 sm:p-8 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                      <ImageIcon size={24} className="text-orange-500" />
                    </div>
                    <div className="text-left flex flex-col items-start">
                      <h2 className="text-[1.1rem] font-bold text-gray-800">세부 디테일 이미지</h2>
                      <p className={`text-sm font-medium mt-0.5 ${floorDetailImages.length > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                        {floorDetailImages.length > 0 ? `입력 완료 (${floorDetailImages.length}장)` : '입력 전 (최대 2장)'}
                      </p>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {openSections.floorDetail ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </button>

                <AnimatePresence>
                  {openSections.floorDetail && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 sm:p-8 pt-0 border-t border-gray-100/60 mt-2">
                        <div 
                          onDragOver={onDragOver}
                          onDragEnter={onDragEnter}
                          onDragLeave={onDragLeave}
                          onDrop={onDropFloorDetail}
                        >
                          {floorDetailImages.length < 2 && (
                            <div 
                              onClick={() => floorDetailInputRef.current?.click()}
                              className="border-[2px] border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 hover:border-orange-300 transition-all mb-4"
                            >
                              <Plus size={24} className="text-gray-400" />
                              <p className="text-sm text-gray-500 font-bold">세부 디테일 사진 드롭 또는 클릭</p>
                              <input 
                                type="file" 
                                ref={floorDetailInputRef} 
                                onChange={(e) => processFiles(e.target.files, 'floorDetail')} 
                                multiple
                                accept="image/*" 
                                className="hidden" 
                              />
                            </div>
                          )}

                          <div className="space-y-4">
                            <AnimatePresence>
                              {floorDetailImages.map((img) => (
                                <motion.div
                                  key={img.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="relative group bg-gray-50 rounded-[1rem] p-3 pr-4 flex items-center gap-4 border border-gray-100/80 shadow-sm"
                                >
                                  <div className="relative w-20 h-20 rounded-xl overflow-hidden shadow-sm shrink-0 bg-white">
                                    <img src={img.preview} alt="uploaded" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => setSelectedImageFullscreen(img.preview)}>
                                      <Search size={20} className="text-white" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">{img.file.name}</p>
                                    <p className="text-xs text-gray-500 font-medium mt-0.5">{(img.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeImage(img.id, 'floorDetail'); }}
                                    className="p-2.5 rounded-full bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </>
          )}

{/* Sticky Floating Generate Button */}
          <div className="sticky bottom-6 z-40">
            <div className="bg-white/90 backdrop-blur-xl p-4 sm:p-5 rounded-[2rem] shadow-[0_10px_40px_rgb(0,0,0,0.12)] border border-gray-200/60 transition-all">
              <button
                onClick={generateImages}
                disabled={isGenerating || (activeTab === 'graphic' && images.length === 0) || (activeTab === 'floor' && floorFrontImages.length === 0 && floorBackImages.length === 0 && floorLogoImages.length === 0 && floorDetailImages.length === 0) || (activeTab === 'concept' && conceptRefImages.length === 0)}
                className={`w-full py-5 rounded-[1.5rem] font-black text-[1.1rem] transition-all flex items-center justify-center gap-3 ${
                  isGenerating || (activeTab === 'graphic' && images.length === 0) || (activeTab === 'floor' && floorFrontImages.length === 0 && floorBackImages.length === 0 && floorLogoImages.length === 0 && floorDetailImages.length === 0) || (activeTab === 'concept' && conceptRefImages.length === 0)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#1A1A1A] to-[#333333] text-white hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/20 active:translate-y-0 active:scale-[0.99]'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    병렬 생성 중... ({results.length} / {count})
                  </>
                ) : (
                  activeTab === 'concept' ? '컨셉 배경 생성 시작하기' : (activeTab === 'floor' ? '바닥컷 생성 시작하기' : '모델 컷 생성 시작하기')
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Generation Results Viewer */}
        <div className="xl:col-span-8 flex flex-col">
          <div className="bg-white rounded-[2rem] p-10 min-h-[850px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 flex items-center justify-center rounded-xl">
                  <LayoutGrid size={24} className="text-[#1A1A1A]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black">갤러리</h2>
                  <p className="text-sm font-medium text-gray-500 mt-1">결과물에 마우스오버 시 바로 내려받아 집니다.</p>
                </div>
              </div>
              
              {isGenerating && count > 0 && (
                <div className="flex items-center gap-4 bg-gray-50 px-6 py-3 rounded-full border border-gray-200">
                  <div className="w-40 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-blue-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ ease: "easeInOut", duration: 0.5 }}
                    />
                  </div>
                  <span className="text-sm font-black text-blue-600">{Math.round(progress)}%</span>
                </div>
              )}
            </div>

            {results.length === 0 && !isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-start pt-32 text-center space-y-6">
                <div className="w-28 h-28 bg-gray-50/80 rounded-full flex items-center justify-center border-8 border-white shadow-xl">
                  <ImageIcon className="text-gray-300 w-12 h-12" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">아직 생성된 이미지가 없습니다</h3>
                  <p className="text-base text-gray-500 mt-2 max-w-sm mx-auto font-medium leading-relaxed">
                    좌측에서 필수 상품 이미지를 업로드하고 생성을 시작하시면 이곳에서 갤러리를 확인할 수 있습니다.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence mode="popLayout">
                  {results.map((img, idx) => (
                    <motion.div
                      key={img.id}
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
                      className="group relative bg-gray-50 rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-200"
                      style={{ aspectRatio: getCssAspectRatio(aspectRatio) }}
                    >
                      <img 
                        src={img.url} 
                        alt={`Result ${idx + 1}`} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                        <p className="text-white text-sm font-medium mb-5 opacity-90 indent-0">"{img.prompt}"</p>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => setSelectedImageFullscreen(img.url)}
                            className="bg-white/20 text-white p-3 rounded-xl hover:bg-white/30 transition-colors backdrop-blur-sm flex items-center justify-center"
                          >
                            <Maximize2 size={18} />
                          </button>
                          <button 
                            onClick={() => downloadSingle(img.url, `model_cut_${idx + 1}`)}
                            className="flex-1 bg-white text-black py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors shadow-lg"
                          >
                            <Download size={18} />
                            저장
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Skeletons while generating */}
                  {isGenerating && results.length < count && (
                    Array.from({ length: Math.min(3, count - results.length) }).map((_, i) => (
                      <motion.div 
                        key={`skeleton-${i}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="relative bg-gray-100/50 rounded-[1.5rem] overflow-hidden border border-gray-200 flex items-center justify-center"
                        style={{ aspectRatio: getCssAspectRatio(aspectRatio) }}
                      >
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                          <Loader2 className="text-gray-300 animate-spin w-10 h-10" />
                          <span className="text-sm font-bold text-gray-400">생성 중...</span>
                        </div>
                        <div className="w-full h-full bg-gradient-to-tr from-gray-50 to-gray-200 animate-pulse opacity-50"></div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f9fafb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
          border: 2px solid #f9fafb;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}} />

      {/* Fullscreen Image View Modal */}
      <AnimatePresence>
        {selectedImageFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-10"
            onClick={() => setSelectedImageFullscreen(null)}
          >
            <button 
              className="absolute top-6 right-6 text-white bg-black/50 hover:bg-white/20 p-3 rounded-full backdrop-blur-md transition-colors"
              onClick={() => setSelectedImageFullscreen(null)}
            >
              <X size={24} />
            </button>
            <motion.img 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={selectedImageFullscreen} 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showErrorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-red-600 mb-4">생성 중 오류 발생</h3>
              <div className="bg-red-50 p-6 rounded-xl border border-red-100 max-h-96 overflow-y-auto">
                <p className="font-medium text-sm text-red-800 whitespace-pre-wrap break-all">{error}</p>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="px-6 py-3 rounded-xl bg-[#1A1A1A] text-white font-medium hover:bg-gray-800 transition-colors"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper for CSS Aspect Ratio property
function getCssAspectRatio(ratio: AspectRatio): string {
  switch (ratio) {
    case '1:1': return '1 / 1';
    case '3:2': return '3 / 2';
    case '2:3': return '2 / 3';
    case '16:9': return '16 / 9';
    case '9:16': return '9 / 16';
    default: return '2 / 3';
  }
}
