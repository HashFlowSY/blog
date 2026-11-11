# 三维工作台怎样保留二维铅笔稿的笔触

建议把当前首页成稿里的原笔触投射到对应的 3D 表面，按可见性筛选后烘焙进每个部件的 UV。参考机位以当前 2D 成稿逐像素对照，旋转时核对同一处木纹、划痕或排线随同一个部件移动。背面、底面和被前景挡住的区域需要补绘，参照原稿的笔宽、深浅和纹路走向。 [Debevec 等《Modeling and Rendering Architecture from Photographs》§3](https://www.pauldebevec.com/Research/debevec-siggraph96.pdf) · [Blender Cycles 烘焙](https://docs.blender.org/manual/en/4.5/render/cycles/baking.html)

## 当前项目的差异

- **2D 显示原画图层。** 绘制完成后，SVG 在 1536 × 1024 的坐标系叠放 `tools`、`foundation`、`surface` 三张带透明度的 WebP，再乘到纸张背景上。以下以浏览器实际显示的成稿为参照。 [成稿合成](../../src/components/home/workbench-reveal.tsx#L142) · [纸张与画面合成](../../src/components/home/assembly-workbench.module.css#L46)
- **3D 只在部分平面取原画。** 台沿、两个屏幕等部位从 `workbench-pencil-detail.webp` 取样。桌面上表面、凳面、黄抽屉和左下箱盖使用石墨图集。着色器沿三个模型轴采样图块、混合纹路，再按光照叠加排线。由此得到的是位置固定的另一套笔触。 [桌面](../../src/components/home/workbench-model.ts#L329) · [黄抽屉](../../src/components/home/workbench-model.ts#L596) · [大屏](../../src/components/home/workbench-model.ts#L1294) · [箱盖与凳面](../../src/components/home/workbench-model.ts#L1585) · [石墨材质](../../src/components/home/workbench-materials.ts#L161)
- **构图对齐后仍存在局部差异。** 固定参考相机和两层共用的构图参数已经存在。静止时显示 2D，拖动后的首个有效帧切换到 3D。固定相机直接查看 3D 时，凳面交叉排线、黄抽屉细划痕和箱盖深色排线已经不同。灯条位置、工具轮廓和右后桌腿也有可见差异，需要分别核对几何位置和线条。 [参考相机](../../src/components/home/workbench-view.ts#L27) · [首帧切换](../../src/components/home/workbench-scene.ts#L182) · [模型轮廓](../../src/components/home/workbench-model.ts#L1751)

### 同机位截图

对 `e0c5029` 的静态产物使用 macOS Chrome 157，视口 1440 × 900，DPR 2。等 2D 绘制完成和 WebGL 就绪后，先在同一个参考角度分别显示两层，再采集实际拖动 1 CSS 像素后的 3D 帧。前两张的相机位置相同，偏航和俯仰为 0°，缩放为 1。第三张偏航约 −0.475°。只在浏览器检查时修改显示状态，使用 1502 × 988 的同范围截图。

| 局部       | 2D 与同机位 3D | 3D 静止与首拖帧 |
| ---------- | -------------: | --------------: |
| 左侧桌面   |           9.71 |            1.23 |
| 大屏内容   |           8.71 |            1.48 |
| 凳面       |           9.57 |            1.43 |
| 黄抽屉面板 |           9.57 |            0.64 |
| 左下箱盖   |          31.47 |            1.13 |

数值为选定局部的 RGB 通道平均绝对差，范围 0–255，包含纹路、色差和小范围轮廓偏移的影响。局部取样坐标和原始截图保存在本地 `qa-evidence/workbench-texture-research/output/playwright/`。 [同机位对照图](../../qa-evidence/workbench-texture-research/output/playwright/comparison.png)

## 可选方案

| 方案                              | 可达到的效果                                                                                   | 对本项目的取舍                                                                                                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 固定参考相机投射原画              | 直接保留参考机位可见的笔触。精确对齐的表面内部可以取回同一原画像素。                           | 可沿用当前相机与部分平面校正。遮挡区需要部件遮罩、深度和补绘。 [NVIDIA 投射纹理](https://developer.download.nvidia.com/assets/gamedev/docs/projective_texture_mapping.pdf)      |
| **原画投射后烘焙 UV，再补绘各面** | 笔触固定在零件表面，支持任意方向旋转。桌面、凳面等原画可见处保留细节，新露出的面延续同一纹理。 | 建议采用。主要工作是逐件对齐、标注遮挡、处理 UV 接缝和补绘。 [Blender 烘焙及扩边](https://docs.blender.org/manual/en/4.5/render/cycles/baking.html#margin)                      |
| 增加侧、背、底部参考稿            | 能补足单图缺失的表面，为凳沿、柜体和工具等细节提供多方向依据。                                 | 适合作为 UV 烘焙的素材。对齐各视图后合进固定贴图，重叠区保留一套细线。 [Waechter 等，多视图纹理](https://download.hrz.tu-darmstadt.de/pub/FB20/GCC/paper/Waechter-2014-LTB.pdf) |
| 以 3D 渲染作为 2D 成稿的来源      | 静止成稿与旋转起点可以复用同一张参考帧，同时共享一套表面纹路。                                 | 适用于接受重新定稿的情况。仍需要按现有原画回调纹理和轮廓，再用新成稿接上绘制动画。                                                                                              |
| 单图生成新视角或纹理              | 可以给缺图区域提供草图。                                                                       | 保留原画覆盖区，逐件审阅生成稿的结构、笔触和接缝。 [Zero-1-to-3](https://arxiv.org/abs/2303.11328) · [TEXTure](https://arxiv.org/abs/2302.01721)                                |

单张原稿能定义它所看到的笔迹。整圈旋转时，同一笔迹的投影会随角度、远近和遮挡变化，侧背面也会露出原稿中没有记录的区域。逐像素对照适用于固定参考机位，共视表面以笔触位置、方向和浓淡的连续性验收。 [Debevec 等，投射与可见性](https://www.pauldebevec.com/Research/debevec-siggraph96.pdf) · [Praun 等，连续排线](https://hhoppe.com/hatching.pdf)

## 建议实施顺序

1. **建立共同原画。** 从当前首页三层成稿生成同构图、带透明度的无损参考合成，保留现有绘制遮罩。在同一个浏览器里先测 2D 与无光照平面的差异，核对 sRGB、透明度、像素中心和乘色合成。纸纹留在统一背景，实体排线和接触阴影使用对应的表面或地面。
2. **逐件校准相机和几何。** 沿用参考相机，在图中标注桌沿和桌面角点、屏幕四角、凳面边界、抽屉缝和把手。用参考机位渲染部件 ID 和深度，与标注匹配后才能取原画。电脑、钳工等只给最前方的正确部件取色，桌面遮挡区留给补绘。先调整错位的实体和轮廓，然后生成贴图。
3. **先做四个样段。** 桌沿和桌面用对齐的面坐标保留笔触，木纹按同一方向延伸到电脑后方。右屏保留图线，边框和底座按对应几何分开取样。凳面按圆面投射，凳沿按圆周展开，补齐底面。黄抽屉把原稿面板的黄色和细划痕落到面板上，拉手与边沿各自取色。
4. **离线烘焙并补齐整件。** 将可见原画投射一次性烘焙到各部件的 UV，在同一图集画完侧面、背面、底面和遮挡区。接缝优先落在转角或暗边，按缩放需求给 UV 岛留扩边。保存已画出的明暗，避免对同一处笔触重复施加实时阴影或描边。给缺失的轮廓和表面按相同笔宽补线，保留真实孔洞和部件厚度。可在现有 Three.js 网格和静态资源流程内完成。
5. **按同一角度验收，再检查旋转。** 先在参考机位逐部件做叠图和差分，分开检查轮廓误差及面内纹路。再用实际鼠标首拖和双指缩放核对交接，在侧、背、底面追踪同一条木纹和划痕，检查露出的表面、边缘和缩小时的细线。

样段验收可先将稳定可见的笔触锚点偏差控制在原画 1 像素内，将同机位内区 RGB 平均绝对差降到 3/255 以内。这是样段试做时的目标。若要求参考帧差分严格为零，固定尺寸下两种状态应共享同一参考帧和合成结果，另取同机位网格帧核对几何贴合。首拖和连续绕转须确认没有重影、纹路滑动或重复描边，放大看侧面、背面和底部也应有连续排线。

## 投射与渲染细节

- **投射的透视计算。** 使用固定参考相机将表面点变换到参考图坐标，在片元阶段或逐纹素烘焙时再做透视除法。只在顶点求出最终 UV 并插值会让大三角形内部采样偏离。平面可以按四个对应角点校正透视，曲面和有遮挡的区域用参考深度及部件 ID。手绘透视难以拟合的局部优先校准零件位置和尺寸。 [NVIDIA《Projective Texture Mapping》](https://developer.download.nvidia.com/assets/gamedev/docs/projective_texture_mapping.pdf) · [OpenCV 透视变换](https://docs.opencv.org/4.x/da/d54/group__imgproc__transform.html) · [Blender UV Project](https://docs.blender.org/manual/en/4.5/modeling/modifiers/modify/uv_project.html)
- **诊断灰阶和透明度。** 固定输出尺寸、裁切和背景，依次对照原图、贴有同一原图的无光照平面和参考机位的 3D 网格。平面与原图之间先查 sRGB 转换、alpha、乘色和采样。平面与网格之间再查相机、几何和投射遮罩。用白色乘数、无光照材质核对已画好的明暗。 [Three.js 色彩管理](https://threejs.org/manual/pages/color-management.html) · [Three.js MeshBasicMaterial](https://threejs.org/docs/pages/MeshBasicMaterial.html) · [W3C 透明度与乘色合成](https://www.w3.org/TR/compositing-1/)
- **保住细排线。** 可先在原图分辨率对齐像素中心，用最近邻做诊断。烘焙和渲染会各自采样，贴图需要保留足够纹素和 UV 扩边。实际旋转时用 mipmap 和各向异性过滤，检查斜视与缩小时的模糊、摩尔纹和闪烁。 [Khronos glTF 纹理采样规范](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#samplers) · [Three.js Texture](https://threejs.org/docs/pages/Texture.html) · [Blender Cycles 烘焙与扩边](https://docs.blender.org/manual/en/4.5/render/cycles/baking.html#margin)
- **处理纹理接缝和轮廓。** 多张图覆盖同一表面时优先保留最清晰、位置最可靠的笔迹，在接缝处匹配笔划和底色。运行时按观察方向混合错位细线容易产生重影。轮廓随相机的遮挡关系重算，实体内部的排线和划痕始终跟随表面。 [Waechter 等《Large-Scale Texturing of 3D Reconstructions》§2](https://download.hrz.tu-darmstadt.de/pub/FB20/GCC/paper/Waechter-2014-LTB.pdf) · [Debevec 等《Efficient View-Dependent Image-Based Rendering》](https://www2.eecs.berkeley.edu/Pubs/TechRpts/1998/5676.html) · [Blender Line Art 轮廓与遮挡](https://docs.blender.org/manual/en/4.5/grease_pencil/modifiers/generate/line_art.html#edge-types)

把原稿分层放到几个深度上也能保留原始笔触，适合小幅视差和推近。整圈绕转还需要完整的侧背面与遮挡信息。 [Horry 等《Tour Into the Picture》](https://www.cs.princeton.edu/courses/archive/spr01/cs598b/papers/horry97.pdf) · [Niklaus 等《3D Ken Burns Effect from a Single Image》](https://sniklaus.com/kenburns)

## 生成新视图能补什么

Zero-1-to-3 利用训练先验从一张图生成新视角，TEXTure 利用已有网格和深度条件迭代生成纹理。用于工作台时，可以保留已有原稿投影，只对缺图区域产生候选纹理，再在模型上核对接缝和笔触。单图对应的背面外观有多种可能，侧背面的结果需要作为新创作来确认。 [Liu 等《Zero-1-to-3》](https://arxiv.org/abs/2303.11328) · [Richardson 等《TEXTure》](https://arxiv.org/abs/2302.01721)

原始 NeRF 用多张已知相机位姿的图像拟合辐射场，原始 3D Gaussian Splatting 从相机标定得到的稀疏点出发，拟合可渲染新视角的三维高斯。两者适用于有多视图素材的新视角展示。若工作台需要继续用现有网格编辑部件与贴图，选用这类表示还要解决与网格和 UV 的转换。 [Mildenhall 等《NeRF》](https://arxiv.org/abs/2003.08934) · [Kerbl 等《3D Gaussian Splatting》](https://arxiv.org/abs/2308.04079)
