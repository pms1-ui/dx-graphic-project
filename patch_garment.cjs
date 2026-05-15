const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = `          </section>
          {/* Garment Upload Section */}
          <section className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <Upload size={20} className="text-orange-500" />
              </div>
              <h2 className="text-[1.1rem] font-bold">상품 이미지 (누끼컷 등, 필수)</h2>
            </div>
            
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
                onChange={(e) => processFiles(e.target.files, false)} 
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
                      <button 
                        onClick={() => toggleView(img.id)}
                        className="text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors mt-1"
                      >
                        {img.view === 'front' ? '정면 (Front) 설정됨' : '후면 (Back) 설정됨'}
                      </button>
                    </div>
                    <button 
                      onClick={() => removeImage(img.id, false)}
                      className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>

          {/* Reference Models Upload Section */}`;

fs.writeFileSync('src/App.tsx', content.replace('          </section>\n\n          {/* Reference Models Upload Section */}', replacement));
