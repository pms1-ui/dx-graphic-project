const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const garmentStart = code.indexOf(`{/* Garment Upload Section */}`);
const genButtonStart = code.indexOf(`{/* Sticky Floating Generate Button */}`);

let graphicSections = code.substring(garmentStart, genButtonStart);

let conceptSections = `          {/* Concept Upload Sections */}
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
                      <p className={\`text-sm font-medium mt-0.5 \${conceptRefImages.length > 0 ? 'text-indigo-500' : 'text-gray-400'}\`}>
                        {conceptRefImages.length > 0 ? \`입력 완료 (\${conceptRefImages.length}장)\` : '입력 전'}
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
                      <h2 className="text-[1.1rem] font-bold text-gray-800">오브젝트</h2>
                      <p className={\`text-sm font-medium mt-0.5 \${conceptObjImages.length > 0 ? 'text-orange-500' : 'text-gray-400'}\`}>
                        {conceptObjImages.length > 0 ? \`입력 완료 (\${conceptObjImages.length}장)\` : '입력 전'}
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

`;

code = code.substring(0, garmentStart) + 
  "          {activeTab === 'graphic' && (\n            <>\n" + 
  graphicSections + 
  "            </>\n          )}\n\n" + 
  conceptSections + 
  code.substring(genButtonStart);

fs.writeFileSync('src/App.tsx', code);
