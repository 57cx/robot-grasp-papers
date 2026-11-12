# GO2 + PiPER + RealSense：腿臂移动操作与精细抓取阅读计划

> 面向：Unitree GO2 EDU + AgileX PiPER / PiPER-X + Intel RealSense D435i / D405。更新于 2026-11-12。
> 完整论文库（145 篇，机器可读）见 `papers.json`；本计划引用其中的 `id`。所有论文的标题/作者/年份都已用 arXiv API 或 Crossref 核对，会议信息与 Semantic Scholar 交叉核对过。

## 最推荐先读的 3 篇

1. **LocoPilot: Single-Operator Bilateral Teleoperation for Loco-Manipulation Policy Learning**（arXiv 2026）— https://arxiv.org/abs/2610.27998  
   硬件与你几乎完全一致（GO2+PiPER L+D435 腕部/D405 头部），是搭数据采集系统的第一参考
1. **UMI on Legs: Making Manipulation Policies Mobile with Manipulation-Centric Whole-body Controllers**（CoRL 2024）— https://arxiv.org/abs/2407.10353  
   与你的硬件最相近（Go2+轻量 6 轴臂），代码开源；把 ARX5 换成 PiPER 需按 PiPER 运动学重训全身控制器，是首选复现目标
1. **RoboDuet: Learning a Cooperative Policy for Whole-body Legged Loco-Manipulation**（RA-L 2025）— https://arxiv.org/abs/2403.17367  
   与你的硬件最接近之一（Go2+6 轴轻量臂），开源 Isaac Gym 代码可直接替换 PiPER URDF 训练

## 总览

| 阶段 | 主题 | 建议时长 | 先读 |
|---|---|---|---|
| 1 | 入门：综述 + 同构硬件系统 + 工具链跑通 | 2 周 | LocoPilot；UMI on Legs；Loco-Manipulation With Quadruped Robots |
| 2 | 腿臂全身控制（RL / MPC / 混合）与 sim2real | 3 周 | RoboDuet；Visual Whole-Body Control for Legged Loco-Manipulation；MLM |
| 3 | 抓取感知、手眼标定/视觉伺服、力控与模仿学习 | 4 周 | GraspNet-1Billion；AnyGrasp；Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware |
| 4 | VLA / 基础模型与前沿 | 3 周 | π0；SmolVLA；Fine-Tuning Vision-Language-Action Models |

总计约 12 周（每周 3–4 篇精读，外加动手实验）。

## 阶段 1：入门：综述 + 同构硬件系统 + 工具链跑通（2 周）

**目标**：建立腿臂移动操作的整体地图；读懂与你硬件几乎同构的系统论文；把 GO2 / PiPER / RealSense 的 SDK 全部跑通。

**先读**：`langella2026locopilot`、`ha2024umionlegs`、`rahman2026locomanip_review`

**配套动手**：piper_sdk 读写关节/夹爪；piper_ros(humble 分支)+MoveIt 规划；unitree_sdk2 让 GO2 调整站姿/身高；realsense-ros 同时出 D435i 与 D405 点云；跑通 LeRobot+PiPER 插件录一条示教。

| # | 论文 | 作者 | 会议/期刊 | 一句话 | 开源 | 与本硬件的相关性 | 可复现性 |
|---|---|---|---|---|---|---|---|
| 1 | [LocoPilot: Single-Operator Bilateral Teleoperation for Loco-Manipulation Policy Learning](https://arxiv.org/abs/2610.27998) | Antonio Langella, Giovanni Minelli, Giovanni B. Dessy et al. | arXiv 2026 | 腿臂机器人上同时遥控底盘、身体姿态、机械臂和夹爪很难，且缺少力反馈。做法：单人双边遥操作：另一台 Piper L 做主臂、手柄控底盘，无力传感器估计从臂接触力并经被动性约束触觉通道反馈 | [代码](https://github.com/iit-DLSLab/LocoPilot) | 硬件与你几乎完全一致（GO2+PiPER L+D435 腕部/D405 头部），是搭数据采集系统的第一参考 | 高 |
| 2 | [From Tabletop to Walking Bot: Deploying a VLA Model on a Legged Manipulator Robot](https://arxiv.org/abs/2610.32271) | Giovanni Minelli, Antonio Langella, Giovanni B. Dessy et al. | arXiv 2026 | 桌面上成熟的 VLA 微调流程搬到四足腿臂上会遇到什么问题。做法：在 Go2+AgileX Piper 上系统研究数据采集、模型变体、动作块长度与示教规范对 VLA 闭环移动操作的影响 | 未开源 | 同硬件的 VLA 部署经验报告，可直接照抄其设置作为你的 VLA 基线 | 高 |
| 3 | [UMI on Legs: Making Manipulation Policies Mobile with Manipulation-Centric Whole-body Controllers](https://arxiv.org/abs/2407.10353) | Huy Ha, Yihuai Gao, Zipeng Fu et al. | CoRL 2024 | 桌面 UMI 采的数据如何让四足腿臂机器人用起来。做法：用 UMI 手持夹爪采集末端轨迹训练 Diffusion Policy，以"任务空间末端轨迹"为接口，交给 RL 训练的操作中心全身控制器执行 | [代码](https://github.com/real-stanford/umi-on-legs) | 与你的硬件最相近（Go2+轻量 6 轴臂），代码开源；把 ARX5 换成 PiPER 需按 PiPER 运动学重训全身控制器，是首选复现目标 | 高 |
| 4 | [Loco-Manipulation With Quadruped Robots: Modeling, Task Taxonomy, and Control Methods—A Critical Review](https://doi.org/10.1109/ACCESS.2026.3672605) | Md Hafizur Rahman, Muhammad Faizan Mysorewala, Muhammad Majid Gulzar et al. | IEEE Access 2026 | 四足移动操作文献缺少统一框架。做法：提出"建模-任务-控制"三元框架，梳理 WBC/MPC/RL/混合方法与任务分类 | 未开源 | 最贴题的四足移动操作综述，用来建立整体地图 | 高 |
| 5 | [Learning-based legged locomotion; state of the art and future perspectives](https://arxiv.org/abs/2406.01152) | Sehoon Ha, Joonho Lee, Michiel van de Panne et al. | arXiv 2024 | 学习式腿式运动的全景。做法：综述 RL/IL 在腿式运动的发展、sim2real、未来方向（含移动操作） | 未开源 | 腿臂方向入门综述首选 | 高 |
| 6 | [Deep Whole-Body Control: Learning a Unified Policy for Manipulation and Locomotion](https://arxiv.org/abs/2210.10044) | Zipeng Fu, Xuxin Cheng, Deepak Pathak | CoRL 2022 (Oral) | 四足+机械臂若把腿和臂分开控制，臂一动身体就晃，工作空间也小。做法：用一个 RL 策略同时输出 12 个腿关节和 6 个臂关节，提出 Regularized Online Adaptation 和 Advantage Mixing 解决训练难题 | 未开源 | 腿臂一体 RL 的开山之作，GO2+PiPER 做统一策略基本照此设计观测/动作空间与奖励 | 中 |
| 7 | [Combining Learning-based Locomotion Policy with Model-based Manipulation for Legged Mobile Manipulators](https://arxiv.org/abs/2201.03871) | Yuntao Ma, Farbod Farshidian, Takahiro Miki et al. | RA-L 2022 | 直接端到端难，如何把成熟的学习运动和模型法臂控制结合。做法：RL 运动策略显式考虑臂产生的扰动力（预测并补偿），臂用模型 MPC | 未开源 | 最适合起步的工程方案：GO2 自带运动+PiPER 用 MoveIt/IK，再补偿臂扰动 | 高 |

选读：[OK-Robot: What Really Matters in Integrating Open-Knowledge Models for Robotics](https://arxiv.org/abs/2401.12202)；[Foundation Models in Robotics: Applications, Challenges, and the Future](https://arxiv.org/abs/2312.07843)；[Spot-Compose: A Framework for Open-Vocabulary Object Retrieval and Drawer Manipulation in Point Clouds](https://arxiv.org/abs/2404.12440)；[Helpful DoggyBot: Open-World Object Fetching using Legged Robots and Vision-Language Models](https://arxiv.org/abs/2410.00231)

## 阶段 2：腿臂全身控制（RL / MPC / 混合）与 sim2real（3 周）

**目标**：掌握统一策略 vs 分层策略、教师-学生蒸馏、RL+模型混合；能在 Isaac Gym/Lab 中训练 GO2+PiPER 的末端位姿跟踪策略。

**先读**：`pan2024roboduet`、`liu2024visual`、`liu2025mlm`

**配套动手**：用 RoboDuet 或 legged_gym 代码，把 PiPER URDF 装到 GO2 上，训练 6D 末端跟踪策略，记录末端跟踪误差曲线。

| # | 论文 | 作者 | 会议/期刊 | 一句话 | 开源 | 与本硬件的相关性 | 可复现性 |
|---|---|---|---|---|---|---|---|
| 1 | [Learning to Walk in Minutes Using Massively Parallel Deep Reinforcement Learning](https://arxiv.org/abs/2109.11978) | Nikita Rudin, David Hoeller, Philipp Reist et al. | CoRL 2021 | 四足 RL 训练太慢（以天计）。做法：在 Isaac Gym 上用数千个并行环境+PPO+地形课程，几分钟到十几分钟学会行走 | [代码](https://github.com/leggedrobotics/legged_gym) | legged_gym 是 Go2 RL（含 unitree_rl_gym）的事实标准底座，入门必跑 | 高 |
| 2 | [RMA: Rapid Motor Adaptation for Legged Robots](https://arxiv.org/abs/2107.04034) | Ashish Kumar, Zipeng Fu, Deepak Pathak et al. | RSS 2021 | 仿真训练的策略到真实地形/负载变化时失效。做法：教师策略用特权环境参数训练，学生用历史本体感知在线估计环境隐变量（RMA） | 未开源 | 给 GO2 挂上 PiPER 后质量分布变化，RMA 式在线适应正好对口 | 中 |
| 3 | [Walk These Ways: Tuning Robot Control for Generalization with Multiplicity of Behavior](https://arxiv.org/abs/2212.03238) | Gabriel B Margolis, Pulkit Agrawal | CoRL 2022 (Oral) | 单一策略在新环境泛化差，人又难以调节。做法：训练可调步态参数（步频、抬脚高度、身体高度/姿态等）的多行为策略，部署时人工调参适配 | [代码](https://github.com/Improbable-AI/walk-these-ways) | 可调身体高度/俯仰对于臂够低处物体非常有用，开源代码含 Go1 部署，迁 Go2 难度小 | 高 |
| 4 | [RoboDuet: Learning a Cooperative Policy for Whole-body Legged Loco-Manipulation](https://arxiv.org/abs/2403.17367) | Guoping Pan, Qingwei Ben, Zhecheng Yuan et al. | RA-L 2025 | 统一单策略难训，分开控制又不协调。做法：训练"腿策略+臂策略"两个协作 RL 策略，互相传递信息实现全身 6D 末端位姿跟踪，两阶段训练 | [代码](https://github.com/locomanip-duet/RoboDuet) | 与你的硬件最接近之一（Go2+6 轴轻量臂），开源 Isaac Gym 代码可直接替换 PiPER URDF 训练 | 高 |
| 5 | [Visual Whole-Body Control for Legged Loco-Manipulation](https://arxiv.org/abs/2403.16967) | Minghuan Liu, Zixuan Chen, Xuxin Cheng et al. | CoRL 2024 (Oral) | 让腿臂机器人从视觉自主抓取地面到高处的各种物体。做法：低层：RL 通用全身末端跟踪策略 | [代码](https://github.com/Ericonaldo/visual_wholebody) | "低层全身跟踪+高层视觉策略"架构可直接迁移到 GO2+PiPER+D435i，开源代码是重要起点 | 高 |
| 6 | [MLM: Learning Multi-task Loco-Manipulation Whole-Body Control for Quadruped Robot with Arm](https://arxiv.org/abs/2508.10538) | Xin Liu, Bida Ma, Chenkun Qi et al. | RA-L 2025 | 一个全身策略要兼顾多种移动操作任务难以平衡。做法：用真实遥操作轨迹库+自适应课程采样训练多任务 RL，策略网络预测未来轨迹与速度 | 未开源 | 硬件几乎同构（Go2+6 轴轻量臂），其系统配置与上板部署（Orin NX 50Hz）可直接参考 | 高 |
| 7 | [RAMBO: RL-Augmented Model-Based Whole-Body Control for Loco-Manipulation](https://arxiv.org/abs/2504.06662) | Jin Cheng, Dongho Kang, Gabriele Fadini et al. | RA-L 2025 | 模型法精确但不鲁棒，RL 鲁棒但力控不准。做法：QP 全身控制给前馈力矩，RL 策略输出反馈修正项（RL 增强模型法） | 未开源 | GO2 实机验证的混合控制范式，适合做"精细末端力/位控"研究的基线 | 中 |
| 8 | [QuadWBG: Generalizable Quadrupedal Whole-Body Grasping](https://arxiv.org/abs/2411.06782) | Jilong Wang, Javokhirbek Rajabov, Chaoyi Xu et al. | ICRA 2025 | 腿臂机器人抓取时底盘该站在哪里、怎么配合臂。做法：RL 5D 低层运动策略+基于广义有向可达图（GORM）的抓取感知高层策略，腕部单相机感知抓取位姿 | [代码](https://github.com/javokhirajabov/quadwbg) | 腕部 RealSense+抓取检测+底盘位姿规划正是你的场景，GORM 思想可直接用于 PiPER 工作空间 | 中 |

选读：[A Nonlinear MPC Framework for Loco-Manipulation of Quadrupedal Robots with Non-Negligible Manipulator Dynamics](https://arxiv.org/abs/2507.22042)；[Hybrid Internal Model: Learning Agile Legged Locomotion with Simulated Robot Response](https://arxiv.org/abs/2312.11460)；[A Unified MPC Framework for Whole-Body Dynamic Locomotion and Manipulation](https://arxiv.org/abs/2103.00946)；[Learning Force Control for Legged Manipulation](https://arxiv.org/abs/2405.01402)；[Versatile Multi-Contact Planning and Control for Legged Loco-Manipulation](https://arxiv.org/abs/2308.09179)；[Orbit: A Unified Simulation Framework for Interactive Robot Learning Environments](https://arxiv.org/abs/2301.04195)；[Domain Randomization for Transferring Deep Neural Networks from Simulation to the Real World](https://arxiv.org/abs/1703.06907)

## 阶段 3：抓取感知、手眼标定/视觉伺服、力控与模仿学习（4 周）

**目标**：能用 D435i/D405 做 6-DoF 抓取检测并完成手眼标定；理解柔顺控制；在 PiPER 上训练 ACT/DP/DP3。

**先读**：`graspnet1b`、`fang2022anygrasp`、`zhao2023act`

**配套动手**：眼在手上（D405）与眼在手外（D435i）各标一次并量化重投影/抓取误差；AnyGrasp vs Contact-GraspNet vs GraspGen 在同一批物体上对比；LeRobot 录 50 条示教训练 ACT 与 DP。

| # | 论文 | 作者 | 会议/期刊 | 一句话 | 开源 | 与本硬件的相关性 | 可复现性 |
|---|---|---|---|---|---|---|---|
| 1 | [GraspNet-1Billion: A Large-Scale Benchmark for General Object Grasping](https://doi.org/10.1109/CVPR42600.2020.01146) | Hao-Shu Fang, Chenxi Wang, Minghao Gou et al. | CVPR 2020 | 6-DoF 抓取缺少大规模真实数据与统一评测。做法：用 RealSense D435/Kinect 采集 190 个杂乱场景、10 亿级抓取标注，提出解析式评测与基线网络 | [代码](https://github.com/graspnet/graspnet-baseline) | 数据就是用 RealSense D435 采的，与你的相机一致；graspnet-baseline 可直接在 D435i 点云上跑 | 高 |
| 2 | [AnyGrasp: Robust and Efficient Grasp Perception in Spatial and Temporal Domains](https://arxiv.org/abs/2212.08333) | Hao-Shu Fang, Chenxi Wang, Hongjie Fang et al. | T-RO 2023 | 抓取检测在杂乱/动态场景中既要准又要快且时序稳定。做法：在 GraspNet-1B 上训练稠密监督的几何抓取网络，加时间关联模块追踪动态物体抓取位姿 | [代码](https://github.com/graspnet/anygrasp_sdk) | 最常用的"即插即用"抓取模型，OK-Robot、Spot-Compose 都在用，D435i/D405 点云直接可用 | 高 |
| 3 | [GraspGen: A Diffusion-based Framework for 6-DOF Grasping with On-Generator Training](https://arxiv.org/abs/2507.13097) | Adithyavairavan Murali, Balakumar Sundaralingam, Yu-Wei Chao et al. | ICRA 2026 | 扩散生成抓取多样但质量参差。做法：DiffusionTransformer 生成抓取+在生成器分布上训练的判别器打分（on-generator training），配大规模合成数据 | [代码](https://github.com/NVlabs/GraspGen) | 最新开源 6-DoF 抓取，可指定夹爪模型，可为 PiPER 夹爪定制 | 高 |
| 4 | [ASGrasp: Generalizable Transparent Object Reconstruction and 6-DoF Grasp Detection from RGB-D Active Stereo Camera](https://arxiv.org/abs/2405.05648) | Jun Shi, Yong A, Yixiang Jin et al. | ICRA 2024 | 透明/反光物体深度缺失导致抓取失败。做法：直接用 RealSense 的 IR 双目原始图+RGB 重建可见与被遮挡几何，再做 6-DoF 抓取 | [代码](https://github.com/jun7-shi/ASGrasp) | 专门针对 RealSense 主动立体，D435i/D405 透明物体抓取的直接方案 | 高 |
| 5 | [A new technique for fully autonomous and efficient 3D robotics hand/eye calibration](https://doi.org/10.1109/70.34770) | R.Y. Tsai, R.K. Lenz | IEEE T-RA 1989 | 求相机与机械臂末端之间的变换（手眼标定）。做法：把 AX=XB 分解为先求旋转再求平移的闭式解（Tsai-Lenz） | [代码](https://github.com/IFL-CAMP/easy_handeye) | PiPER+D405（眼在手上）/GO2 头部 D435i（眼在手外）标定都要用 | 高 |
| 6 | [Visual servo control. I. Basic approaches](https://doi.org/10.1109/MRA.2006.250573) | Francois Chaumette, Seth Hutchinson | IEEE RAM 2006 | 如何用视觉误差直接闭环控制机械臂。做法：系统讲解基于图像（IBVS）与基于位置（PBVS）的视觉伺服、交互矩阵推导与稳定性 | [代码](https://github.com/lagadic/visp) | 做末端精细对准（D405 腕部相机）必读，ViSP 库可直接用 | 高 |
| 7 | [Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware](https://arxiv.org/abs/2304.13705) | Tony Z. Zhao, Vikash Kumar, Sergey Levine et al. | RSS 2023 | 低成本硬件上能否学精细双臂操作。做法：ALOHA 主从遥操作采数据 | [代码](https://github.com/tonyzhaozh/act) | LeRobot 原生支持 ACT 且有 PiPER 插件，PiPER 上第一个该跑的策略 | 高 |
| 8 | [Diffusion Policy: Visuomotor Policy Learning via Action Diffusion](https://arxiv.org/abs/2303.04137) | Cheng Chi, Zhenjia Xu, Siyuan Feng et al. | RSS 2023 / IJRR 2024 | 行为克隆难以表达多模态动作分布。做法：把策略建成条件去噪扩散过程，输出动作序列，配滚动时域执行 | [代码](https://github.com/real-stanford/diffusion_policy) | 最主流 IL 基线，LeRobot 原生支持 | 高 |
| 9 | [3D Diffusion Policy: Generalizable Visuomotor Policy Learning via Simple 3D Representations](https://arxiv.org/abs/2403.03954) | Yanjie Ze, Gu Zhang, Kangning Zhang et al. | RSS 2024 | 2D 图像扩散策略泛化差、样本效率低。做法：用稀疏点云的简洁 3D 表示作为扩散策略输入（DP3） | [代码](https://github.com/YanjieZe/3D-Diffusion-Policy) | D435i/D405 点云直接可用，适合精细抓取的数据高效学习 | 高 |
| 10 | [Universal Manipulation Interface: In-The-Wild Robot Teaching Without In-The-Wild Robots](https://arxiv.org/abs/2402.10329) | Cheng Chi, Zhenjia Xu, Chuer Pan et al. | RSS 2024 | 采集机器人示教需要机器人在场。做法：手持带鱼眼 GoPro 的夹爪采数据，SLAM 得末端轨迹，配合延迟匹配与相对轨迹动作表示 | [代码](https://github.com/real-stanford/universal_manipulation_interface) | UMI on Legs 的数据源；可做 PiPER 夹爪同款 UMI 采集器 | 高 |
| 11 | [Adaptive Compliance Policy: Learning Approximate Compliance for Diffusion Guided Control](https://arxiv.org/abs/2410.09309) | Yifan Hou, Zeyi Liu, Cheng Chi et al. | ICRA 2025 | 模仿学习策略只输出位置，接触任务中太硬或太软。做法：扩散策略同时预测末端位姿与随时间变化的刚度/姿态（自适应柔顺），下接导纳控制 | [代码](https://github.com/yifan-hou/adaptive_compliance_policy) | UMI 体系内的力控扩展，PiPER 可用关节电流估计外力实现低配版 | 中 |

选读：[Contact-GraspNet: Efficient 6-DoF Grasp Generation in Cluttered Scenes](https://arxiv.org/abs/2103.14127)；[EasyHeC: Accurate and Automatic Hand-eye Calibration via Differentiable Rendering and Space Exploration](https://arxiv.org/abs/2305.01191)；[CNS: Correspondence Encoded Neural Image Servo Policy](https://arxiv.org/abs/2309.09047)；[FoundationPose: Unified 6D Pose Estimation and Tracking of Novel Objects](https://arxiv.org/abs/2312.08344)；[Closing the Loop for Robotic Grasping: A Real-time, Generative Grasp Synthesis Approach](https://arxiv.org/abs/1804.05172)；[Impedance Control: An Approach to Manipulation: Part I—Theory](https://doi.org/10.1115/1.3140702)；[Learning Force Control for Legged Manipulation](https://arxiv.org/abs/2405.01402)；[Precise and Dexterous Robotic Manipulation via Human-in-the-Loop Reinforcement Learning](https://arxiv.org/abs/2410.21845)；[Data Scaling Laws in Imitation Learning for Robotic Manipulation](https://arxiv.org/abs/2410.18647)；[Consistency Policy: Accelerated Visuomotor Policies via Consistency Distillation](https://arxiv.org/abs/2405.07503)；[Generalizable Humanoid Manipulation with 3D Diffusion Policies](https://arxiv.org/abs/2410.10803)；[Deep Learning Approaches to Grasp Synthesis: A Review](https://arxiv.org/abs/2207.02556)

## 阶段 4：VLA / 基础模型与前沿（3 周）

**目标**：能在 LeRobot/openpi 中微调 VLA 到 PiPER（先固定底盘，再上 GO2）；跟进腿臂+触觉/VLA 最新工作。

**先读**：`black2024pi0`、`shukor2025smolvla`、`kim2025openvlaoft`

**配套动手**：先在 LIBERO 上复现 OpenVLA-OFT / pi0 微调流程，再用自采 PiPER 数据微调 SmolVLA 与 pi0，最后按 Tabletop-to-Walking-Bot 的设置上 GO2。

| # | 论文 | 作者 | 会议/期刊 | 一句话 | 开源 | 与本硬件的相关性 | 可复现性 |
|---|---|---|---|---|---|---|---|
| 1 | [OpenVLA: An Open-Source Vision-Language-Action Model](https://arxiv.org/abs/2406.09246) | Moo Jin Kim, Karl Pertsch, Siddharth Karamcheti et al. | CoRL 2024 | 开源、可微调的大型 VLA。做法：Prismatic VLM（DINOv2+SigLIP+Llama2）在 97 万轨迹上训练，动作离散 token | [代码](https://github.com/openvla/openvla) | 在 PiPER 上微调 VLA 的入门首选之一（社区资料多） | 中 |
| 2 | [Fine-Tuning Vision-Language-Action Models: Optimizing Speed and Success](https://arxiv.org/abs/2502.19645) | Moo Jin Kim, Chelsea Finn, Percy Liang | RSS 2025 | OpenVLA 微调后速度慢、精度不足。做法：并行解码+动作块+连续动作+L1 损失的优化微调配方（OFT） | [代码](https://github.com/moojink/openvla-oft) | 微调 VLA 到 PiPER 时的推荐配方 | 高 |
| 3 | [$π_0$: A Vision-Language-Action Flow Model for General Robot Control](https://arxiv.org/abs/2410.24164) | Kevin Black, Noah Brown, Danny Driess et al. | RSS 2025 | 通用机器人策略需要高频连续控制。做法：PaliGemma VLM+流匹配动作专家，跨 8 种机器人预训练 | [代码](https://github.com/Physical-Intelligence/openpi) | openpi 提供权重与微调脚本，社区已在 PiPER 上微调，是当前最实用的 VLA | 高 |
| 4 | [$π_{0.5}$: a Vision-Language-Action Model with Open-World Generalization](https://arxiv.org/abs/2504.16054) | Physical Intelligence, Kevin Black, Noah Brown et al. | arXiv 2025 | VLA 在全新家庭环境泛化差。做法：异构数据协同训练（多机器人+网页+高层语义子任务预测） | [代码](https://github.com/Physical-Intelligence/openpi) | 移动操作泛化的最新范式，openpi 已提供权重 | 高 |
| 5 | [SmolVLA: A Vision-Language-Action Model for Affordable and Efficient Robotics](https://arxiv.org/abs/2506.01844) | Mustafa Shukor, Dana Aubakirova, Francesco Capuano et al. | arXiv 2025 | 大 VLA 难以在消费级硬件上训练部署。做法：450M 小模型，用社区 LeRobot 数据训练，异步推理 | [代码](https://github.com/huggingface/lerobot) | LeRobot 原生，PiPER 插件可直接采数据→训练→部署，性价比最高的 VLA 起点 | 高 |
| 6 | [LeRobot: An Open-Source Library for End-to-End Robot Learning](https://arxiv.org/abs/2602.22818) | Remi Cadene, Simon Aliberts, Francesco Capuano et al. | ICLR 2026 | 机器人学习工具链碎片化。做法：统一硬件中间件、数据集格式/流式加载、主流策略实现（ACT/DP/pi0/SmolVLA）与异步推理 | [代码](https://github.com/huggingface/lerobot) | 整个 PiPER 学习流水线的底座（配合 lerobot_robot_piper 插件） | 高 |
| 7 | [ReKep: Spatio-Temporal Reasoning of Relational Keypoint Constraints for Robotic Manipulation](https://arxiv.org/abs/2409.01652) | Wenlong Huang, Chen Wang, Yunzhu Li et al. | CoRL 2024 | 如何让 VLM 零样本生成操作约束。做法：VLM 在关键点上写出关系约束（Python 函数），分层优化求末端轨迹 | [代码](https://github.com/huangwl18/ReKep) | 无需示教，PiPER+D435 即可试，适合做"语言→精细末端轨迹" | 高 |
| 8 | [TAC-LOCO: Unified Whole-Body Control for Quadrupedal TACtile-Informed LOCO-Manipulation](https://arxiv.org/abs/2607.10132) | Muqun Hu, Yuhao Zhou, Kabir Ray Malik et al. | arXiv 2026 | 腿臂行走抓物时通常"死死夹住"，不调节抓力，易滑落或损坏物体。做法：把夹爪触觉阵列编码成低维潜变量与本体感知一起输入统一 RL 策略，同时控制腿、臂和夹爪力 | 未开源 | 在 GO2 上把"全身控制+抓力调节"结合的最新工作，可启发给 PiPER 夹爪加触觉/电流估计抓力 | 中 |

选读：[Octo: An Open-Source Generalist Robot Policy](https://arxiv.org/abs/2405.12213)；[Open X-Embodiment: Robotic Learning Datasets and RT-X Models](https://arxiv.org/abs/2310.08864)；[LIBERO: Benchmarking Knowledge Transfer for Lifelong Robot Learning](https://arxiv.org/abs/2306.03310)；[A Survey on Vision-Language-Action Models for Embodied AI](https://arxiv.org/abs/2405.14093)；[FAST: Efficient Action Tokenization for Vision-Language-Action Models](https://arxiv.org/abs/2501.09747)；[RDT-1B: a Diffusion Foundation Model for Bimanual Manipulation](https://arxiv.org/abs/2410.07864)；[WildLMa: Long Horizon Loco-Manipulation in the Wild](https://arxiv.org/abs/2411.15131)；[Human2LocoMan: Learning Versatile Quadrupedal Manipulation with Human Pretraining](https://arxiv.org/abs/2506.16475)

## 基于这套硬件的研究点（初步想法）

### 1. 粗到精的腿臂移动抓取：全局抓取检测 + 腕部 D405 视觉伺服收尾

GO2 头部 D435i 用 AnyGrasp/GraspGen 给出粗抓取位姿，按 QuadWBG 的可达图思想选择底盘停靠位姿与身体高度；进入 30cm 内切换到 PiPER 腕部 D405，用 IBVS 或 CNS 做最后几厘米闭环对准。可量化的指标是小物体/细长物体的一次抓取成功率与末端误差，对比纯开环抓取。

依据：[QuadWBG](https://arxiv.org/abs/2411.06782)；[AnyGrasp](https://arxiv.org/abs/2212.08333)；[GraspGen](https://arxiv.org/abs/2507.13097)；[CNS](https://arxiv.org/abs/2309.09047)；[Visual servo control. I. Basic approaches](https://doi.org/10.1109/MRA.2006.250573)；[Visual Whole-Body Control for Legged Loco-Manipulation](https://arxiv.org/abs/2403.16967)

### 2. 无力传感器的 PiPER 柔顺精细操作

用 PiPER 关节电流/力矩反馈估计末端外力（参考 LocoPilot 的无传感器力估计与 Portela 的隐式力控），在其上加导纳控制，并让扩散策略像 ACP 一样同时输出位姿与刚度。实验可选插孔、擦桌、抓易碎物，比较固定刚度 vs 自适应刚度的成功率与峰值接触力。

依据：[LocoPilot](https://arxiv.org/abs/2610.27998)；[Learning Force Control for Legged Manipulation](https://arxiv.org/abs/2405.01402)；[Adaptive Compliance Policy](https://arxiv.org/abs/2410.09309)；[Impedance Control](https://doi.org/10.1115/1.3140702)；[TAC-LOCO](https://arxiv.org/abs/2607.10132)

### 3. 在 GO2+PiPER 上复现 UMI on Legs，并研究"身体姿态辅助"对低处精细抓取的贡献

把 UMI on Legs 的操作中心全身控制器换成 PiPER 运动学重训（或用 RoboDuet 双策略），上层接 DP/DP3/iDP3。做对照实验：锁定身体 vs 允许身体俯仰/降高，测地面小物体抓取成功率和工作空间覆盖。

依据：[UMI on Legs](https://arxiv.org/abs/2407.10353)；[RoboDuet](https://arxiv.org/abs/2403.17367)；[Walk These Ways](https://arxiv.org/abs/2212.03238)；[3D Diffusion Policy](https://arxiv.org/abs/2403.03954)；[Generalizable Humanoid Manipulation with 3D Diffusion Policies](https://arxiv.org/abs/2410.10803)

### 4. 腿臂平台上小型 VLA 的数据缩放与动作块研究

用 LocoPilot 式双 PiPER 主从遥操作 + LeRobot 插件采集移动抓放数据，比较 SmolVLA、pi0、OpenVLA-OFT 在不同数据量/环境数下的表现。参照 Data Scaling Laws 的"多环境少示教"设计，验证 Tabletop-to-Walking-Bot 中"数据覆盖 vs 模型容量"的结论在你的平台上是否成立。

依据：[From Tabletop to Walking Bot](https://arxiv.org/abs/2610.32271)；[LocoPilot](https://arxiv.org/abs/2610.27998)；[Data Scaling Laws in Imitation Learning for Robotic Manipulation](https://arxiv.org/abs/2410.18647)；[SmolVLA](https://arxiv.org/abs/2506.01844)；[$π_0$](https://arxiv.org/abs/2410.24164)；[Fine-Tuning Vision-Language-Action Models](https://arxiv.org/abs/2502.19645)

### 5. 透明/反光物体的主动视角移动抓取

RealSense 在透明物体上深度缺失，可直接用 D435i/D405 的 IR 双目原始图跑 ASGrasp；再利用腿臂平台的移动能力做主动视角选择（移动底盘/抬臂换视角）来补全几何。对比单视角与主动多视角的透明物体抓取成功率。

依据：[ASGrasp](https://arxiv.org/abs/2405.05648)；[GraspNet-1Billion](https://doi.org/10.1109/CVPR42600.2020.01146)；[QuadWBG](https://arxiv.org/abs/2411.06782)；[Learning Generalizable Feature Fields for Mobile Manipulation](https://arxiv.org/abs/2403.07563)

## PiPER / GO2 / RealSense 开源工具链（仓库均已确认可访问）

- piper_sdk（官方 Python CAN SDK）：https://github.com/agilexrobotics/piper_sdk
- piper_ros（官方 ROS，含 noetic / foxy / humble 分支，带 MoveIt 与仿真）：https://github.com/agilexrobotics/piper_ros
- piper_isaac_sim（官方 Isaac Sim 资产）：https://github.com/agilexrobotics/piper_isaac_sim
- lerobot_robot_piper（AgRobotics Research，LeRobot 第三方插件，需 LeRobot ≥0.4.0）：https://github.com/AgRoboticsResearch/lerobot_robot_piper
- lerobot_robot_piper（WeGo Robotics，主从多臂遥操作插件，PyPI 名 lerobot_robot_wego_piper）：https://github.com/WeGo-Robotics/lerobot_robot_piper
- LeRobot 第三方机器人列表（PiPER 为社区插件，非内置）：https://huggingface.co/docs/lerobot/third_party_robots
- LeRobot：https://github.com/huggingface/lerobot
- openpi（pi0 / pi0.5 / FAST 权重与微调）：https://github.com/Physical-Intelligence/openpi
- unitree_sdk2：https://github.com/unitreerobotics/unitree_sdk2
- unitree_ros2：https://github.com/unitreerobotics/unitree_ros2
- unitree_rl_gym（Go2 RL 训练与部署）：https://github.com/unitreerobotics/unitree_rl_gym
- realsense-ros：https://github.com/IntelRealSense/realsense-ros
- easy_handeye（ROS 手眼标定）：https://github.com/IFL-CAMP/easy_handeye
- ViSP（视觉伺服库）：https://github.com/lagadic/visp
- LocoPilot（GO2+PiPER 遥操作）：https://github.com/iit-DLSLab/LocoPilot

## 说明

- “可复现性 高/中/低”（JSON 字段 `reproducibility`）指在 GO2+PiPER+RealSense 上复现的容易程度：高 = 有代码且硬件相近、容易复现；低 = 平台/传感器差异大或无代码。
- `venue_source` 字段说明会议信息的来源；标为“人工填写”的少数条目建议复核。
- 2026 年新出的 arXiv 工作（如 LocoPilot、Tabletop-to-Walking-Bot、TAC-LOCO）还没正式发表，代码成熟度要自己确认。
