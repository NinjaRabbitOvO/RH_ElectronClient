const homeWebview = document.getElementById("home-webview");
const navButtons = Array.from(document.querySelectorAll(".nav-button[data-page-link]"));
const transferDateInput = document.getElementById("transfer-date");
const transferButton = document.getElementById("start-transfer");
const udpTransferButton = document.getElementById("start-udp-transfer");
const transferActionStatus = document.getElementById("transfer-action-status");
const transferHelpNote = document.getElementById("transfer-help-note");
const transferLog = document.getElementById("transfer-log");
const transferGrid = document.querySelector(".transfer-grid");
const transferDetailsToggle = document.getElementById("transfer-details-toggle");
const protocolEndpoint = document.getElementById("protocol-endpoint");
const protocolStatus = document.getElementById("protocol-status");
const protocolTitle = document.getElementById("protocol-title");
const protocolCommands = document.getElementById("protocol-commands");
const queueTitle = document.getElementById("queue-title");
const folderRule = document.getElementById("folder-rule");
const folderCopy = document.getElementById("folder-copy");
const statCurrentFile = document.getElementById("stat-current-file");
const statFileSize = document.getElementById("stat-file-size");
const statWriteSpeed = document.getElementById("stat-write-speed");
const statRemaining = document.getElementById("stat-remaining");
const transferProgressBar = document.getElementById("transfer-progress-bar");
const transferProgressText = document.getElementById("transfer-progress-text");
const summaryTotalBytes = document.getElementById("summary-total-bytes");
const summaryTotalDuration = document.getElementById("summary-total-duration");
const summaryAverageRate = document.getElementById("summary-average-rate");
const summaryExtra = document.getElementById("summary-extra");
const receivedBrowser = document.getElementById("received-browser");
const receivedFolderModal = document.getElementById("received-folder-modal");
const receivedFolderBackdrop = document.getElementById("received-folder-backdrop");
const receivedFolderClose = document.getElementById("received-folder-close");
const receivedFolderTitle = document.getElementById("received-folder-title");
const receivedFolderSummary = document.getElementById("received-folder-summary");
const receivedFolderList = document.getElementById("received-folder-list");
const receivedFileViewer = document.getElementById("received-file-viewer");
const languageToggleButton = document.getElementById("language-toggle");
const languageToggleIcon = document.getElementById("language-toggle-icon");
const languageToggleText = document.getElementById("language-toggle-text");
const wifiReadyButton = document.getElementById("wifi-ready-button");
const wifiReadyList = document.getElementById("wifi-ready-list");
const wifiReadyLabel = document.getElementById("wifi-ready-label");
const wifiReadyStatus = document.getElementById("wifi-ready-status");
const readyConfirmButton = document.getElementById("ready-confirm-button");
const wifiConnectForm = document.getElementById("wifi-connect-form");
const wifiPasswordInput = document.getElementById("wifi-password-input");
const wifiConnectSubmit = document.getElementById("wifi-connect-submit");
const wifiConnectSaved = document.getElementById("wifi-connect-saved");
const TRANSFER_EVENT_PREFIX = "@@EVENT@@ ";
const filetransferApi =
  window.appApi && window.appApi.filetransfer ? window.appApi.filetransfer : null;
const ACTIVE_WIFI_STORAGE_KEY = "rh_active_wifi_name";
const DEFAULT_TRANSFER_WIFI_NAME = "ESP32-S3";
const LANGUAGE_STORAGE_KEY = "rh_ui_language";
const DEFAULT_LANGUAGE = "en";
const SUPPORTED_LANGUAGES = ["en", "zh"];

const I18N = {
  en: {
    nav: {
      home: "Home",
      file: "File",
      info: "Info",
      languageTitle: "Switch language",
      languageIcon: "EN",
      languageNext: "中文",
    },
    shell: {
      pageEyebrow: "Page",
      pageFile: "Filetransfer",
      pageInfo: "Info",
      placeholderFile: "filetransfer",
      placeholderInfo: "info",
    },
    preflight: {
      eyebrow: "Ready Check",
      title: "Filetransfer",
      line1: "Before starting file transfer,",
      line2: "please ensure you are connected to a nearby device via Wi-Fi.",
      confirm: "Confirm",
      passwordLabel: "Wi-Fi Password",
      passwordPlaceholder: "Enter password (or leave blank for saved profile)",
      connect: "Connect",
      useSaved: "Use Saved",
      scanningStatus: "Scanning for nearby ESP-* networks...",
    },
    content: {
      receiverEyebrow: "Receiver",
      consoleTitle: "Filetransfer Console",
      consoleDesc:
        "Visual shell for the Python receivers. Switch between the TCP stream client and the UDP transfer client, then inspect the live execution output below.",
      activeProtocol: "Active Protocol",
      launcherEyebrow: "Launcher",
      launcherTitle: "Run The Python Receiver",
      transferDate: "Transfer Date",
      startTransfer: "Start Transfer",
      actionStatusDefault: "Choose a date, then launch the Python receiver.",
      logWaiting: "Waiting for execution...",
      receiveEyebrow: "Receive State",
      receiveTitle: "Current File Session",
      statCurrentFile: "Current File",
      statFileSize: "File Size",
      statWriteSpeed: "Write Speed",
      statRemaining: "Remaining",
      summaryEyebrow: "Summary",
      summaryTitle: "Overall Transfer",
      summaryTotalReceived: "Total Received",
      summaryDuration: "Total Duration",
      summaryRate: "Average Rate",
      summaryExtra: "Files / Retries",
      runtimeEyebrow: "Runtime",
      runtimeTitle: "Transfer Parameters",
      metricTransport: "Transport",
      metricRead: "Socket Read",
      metricBlock: "Payload Block",
      metricCompletion: "Completion",
      queueEyebrow: "Date Queue",
      folderRule: "Output Folder Rule",
      protocolEyebrow: "Protocol",
      receivedEyebrow: "Received Files",
      receivedTitle: "Browse By Date",
      receivedDesc:
        "Files are grouped by transfer date. Select a folder to inspect the received file list directly in the app.",
      closeViewer: "Close received folder viewer",
      folderEyebrow: "Received Folder",
      folderContents: "Folder Contents",
      close: "Close",
    },
    info: {
      eyebrow: "Contact",
      title: "Talk To Our Team",
      desc: "Complete the form below to have a member of our sales team address your business needs.",
      fieldAudience: "Who would you like to talk to?*",
      fieldSolution: "What is your solution of interest?*",
      fieldFirstName: "First Name*",
      fieldLastName: "Last Name*",
      fieldEmail: "Company Email*",
      fieldCompany: "Company*",
      fieldJobTitle: "Job Title*",
      fieldPhone: "Phone Number*",
      fieldCountry: "Country*",
      fieldState: "State or Province",
      fieldAdditional: "Additional Information",
      marketing: "Send me Broadcom communications",
      policy:
        "I agree to receive commercial messages from Group-10. I understand my personal data is processed according to Group-10's Privacy Policy and I may unsubscribe from emailed communications at any time.",
      submit: "Submit",
      supportTitle: "Contact Support",
      supportDesc:
        "For customer service-related questions or product support, please visit Contact Support.",
      supportLink: "Click Here",
      pleaseSelect: "Please Select...",
    },
    transfer: {
      failureNote:
        "Please verify that you are connected to a nearby device via Wi-Fi, then restart the transfer.",
      chooseDateFirst: "Please choose a valid transfer date first.",
      launchFailed: "Transfer launch failed before the receiver started.",
      noRealtimeEvents: "Realtime transfer events are unavailable until the app is restarted.",
      apiUnavailable: "Transfer API is unavailable. Restart the app to reload preload scripts.",
      rendererApiError: "Renderer could not access window.appApi.filetransfer.",
      launchFailedFallback: "Failed to launch transfer.",
      processExited: "Process exited with code {{code}}{{signal}}.",
      selectedDate: "Selected date: {{date}}",
      receivedDateRule: "Each input date maps to a dedicated receive directory.",
      receivedUdpRule:
        "The UDP client stores files in a <Wi-Fi>_ReYYYYMMDD directory and appends .dat files.",
      datViewerSelect: "Select a .dat file to view parsed content.",
      datViewerReading: "Reading and parsing file...",
      datApiUnavailable: "Dat parser API is unavailable until the app is restarted.",
      datParseFailed: "Unable to parse selected .dat file.",
      datParserNoResponse: "Dat parser failed to respond.",
      datBrowserUnavailable: "Received-file browser is unavailable until the app is restarted.",
      datBrowserLoadFailed: "Unable to load received files right now.",
      datFolderEmpty: "No .dat files in this folder.",
      datFolderCardEmpty: "This folder is empty right now.",
      openReceivedFor: "Open received files for {{date}}",
      showcaseFolder: "Showcase Folder",
      protocolFolder: "{{protocol}} Folder",
      filesSummary: "{{count}} files | {{size}}",
      noReceivedFiles: "No received files yet. Completed transfers will appear here by date.",
      exampleDataTitle: "Example Data",
      exampleDataDesc: "Showcase dataset bundled with the app for preview and demonstration.",
      wifiTransfersTitle: "{{wifi}} Received Transfers",
      wifiTransfersDesc: "Files captured from device transfers, grouped by date.",
      noActualFolders: "No actual receive folders yet. Start a transfer to populate this section.",
      datNotFf: "Separator is not 0xFF, no XYZ sample arrays in this file.",
      noHighAlerts: "No high-value alerts.",
      highAlertsTop: "Top {{count}} high-value alerts:",
      threshold: "threshold",
      pointsShort: "pts",
      minimumShort: "min",
      maximumShort: "max",
      axisSuffix: "Axis",
      chartSuffix: "Data Chart",
      sensors: "Sensors",
      sampling: "Sampling",
      sampleSize: "Sample Size",
      startTimestamp: "Start Timestamp",
      sampleSize2: "Sample Size2",
      trailingBytes: "Trailing Bytes",
      count: "Count",
      mean: "Mean",
      median: "Median",
      std: "Std",
      thresholdLabel: "Threshold",
      highAlerts: "High Alerts",
      currentFileUnknown: "Unknown",
      currentFileWaiting: "Waiting",
      currentFileDone: "Done",
      wifiNeedConnectFirst:
        "Please connect to a nearby ESP Wi-Fi successfully before confirming.",
    },
    wifi: {
      scanning: "Scanning Wi-Fi...",
      scanningNearby: "Scanning for nearby ESP-* networks...",
      scanButton: "Scan Wi-Fi",
      networkPending:
        "{{ssid}} detected. Click this card to connect using password or saved profile.",
      apiUnavailable: "Renderer could not access Wi-Fi API. Please restart the app.",
      scanFailed: "Unable to scan Wi-Fi networks.",
      usingLastKnown: "Using last detected {{ssid}}. Scan warning: {{error}}",
      adapterEnabledPrefix: "Wi-Fi adapter enabled. ",
      detectedMultiple: "Detected {{count}} ESP networks. Click one of the green cards to continue.",
      detectedSingle: "Detected {{ssid}}. Click this card to connect.",
      noEspFound: "No ESP-* network found yet. Keep the device nearby and wait for refresh.",
      noEspKeepLast: "No ESP network in this scan. Keeping last detected {{ssid}}.",
      scanExceptionKeep: "Scan exception; keeping {{ssid}}. {{error}}",
      noEspDetected: "Please wait until an ESP-* network is detected.",
      connectApiUnavailable: "Wi-Fi connect API is unavailable. Restart the app and try again.",
      connectingSaved: "Trying saved profile for {{ssid}}...",
      connectingPassword: "Trying to connect to {{ssid}}...",
      connected: "Connected to {{ssid}}.",
      connectFailedSaved:
        "Saved profile failed for {{ssid}}. You can enter password and try again.",
      connectFailedWithError:
        "{{message}} Please verify password and device proximity, then retry.",
      connectFailed:
        "Connection failed. Please verify password and signal, then try again.",
    },
    mode: {
      tcp: {
        status: "TCP Connected Flow",
        title: "TCP Command Stream",
        queueTitle: "Request Pattern",
        pendingText: "Choose a date, then launch the Python TCP receiver.",
        runningText: "Running Python TCP receiver...",
        successText: "TCP transfer completed successfully.",
        failText: "TCP transfer failed. Review the error output below.",
        launchLabel: "Launching TCP transfer job...",
        commands: [
          ["0x11", "Request DK", "Initial handshake before the first date batch starts."],
          ["0x12", "Receive DK", "Reads a fixed 32-byte key block from the server."],
          ["0x02", "Files Count", "Receives the total file count for the selected date."],
          ["0x03", "File Payload", "Reads file name, size, then writes the stream in chunks."],
          ["0x04", "End Of Files", "Marks the end of the current date batch."],
        ],
      },
      udp: {
        status: "UDP Packet Flow",
        title: "UDP Packet Sequence",
        queueTitle: "Batch Discovery",
        pendingText: "Choose a date, then launch the Python UDP receiver.",
        runningText: "Running Python UDP receiver...",
        successText: "UDP transfer completed successfully.",
        failText: "UDP transfer failed. Review the error output below.",
        launchLabel: "Launching UDP transfer job...",
        commands: [
          ["0x01", "HELLO", "Starts a session and waits for HELLO_RSP."],
          ["0x20", "LIST FILES", "Enumerates files for the selected date and optional since cursor."],
          ["0x30", "GET FILE", "Requests a file and negotiates block size."],
          ["0x32", "DATA", "Streams payload packets with sequence and offset fields."],
          ["0x33", "ACK", "Acknowledges each accepted packet back to the server."],
          ["0x34", "FILE END", "Finalizes a file and validates CRC when present."],
        ],
      },
    },
  },
  zh: {
    nav: {
      home: "首页",
      file: "文件",
      info: "信息",
      languageTitle: "切换语言",
      languageIcon: "中",
      languageNext: "EN",
    },
    shell: {
      pageEyebrow: "页面",
      pageFile: "文件传输",
      pageInfo: "信息",
      placeholderFile: "文件传输",
      placeholderInfo: "信息",
    },
    preflight: {
      eyebrow: "准备检查",
      title: "文件传输",
      line1: "在开始文件传输之前，",
      line2: "请确保通过 Wi-Fi 连接到附近设备。",
      confirm: "确认",
      passwordLabel: "Wi-Fi 密码",
      passwordPlaceholder: "输入密码（或留空使用已保存配置）",
      connect: "连接",
      useSaved: "使用已保存",
      scanningStatus: "正在扫描附近 ESP-* 网络...",
    },
    content: {
      receiverEyebrow: "接收端",
      consoleTitle: "文件传输控制台",
      consoleDesc:
        "这是 Python 接收端的可视化界面。你可以在 TCP 流式客户端和 UDP 传输客户端之间切换，并在下方查看实时执行输出。",
      activeProtocol: "当前协议",
      launcherEyebrow: "启动器",
      launcherTitle: "运行 Python 接收器",
      transferDate: "传输日期",
      startTransfer: "开始传输",
      actionStatusDefault: "选择日期后启动 Python 接收器。",
      logWaiting: "等待执行...",
      receiveEyebrow: "接收状态",
      receiveTitle: "当前文件会话",
      statCurrentFile: "当前文件",
      statFileSize: "文件大小",
      statWriteSpeed: "写入速度",
      statRemaining: "剩余",
      summaryEyebrow: "摘要",
      summaryTitle: "整体传输",
      summaryTotalReceived: "总接收量",
      summaryDuration: "总耗时",
      summaryRate: "平均速率",
      summaryExtra: "文件数 / 重试",
      runtimeEyebrow: "运行时",
      runtimeTitle: "传输参数",
      metricTransport: "传输方式",
      metricRead: "Socket 读取",
      metricBlock: "载荷块",
      metricCompletion: "完成码",
      queueEyebrow: "日期队列",
      folderRule: "输出目录规则",
      protocolEyebrow: "协议",
      receivedEyebrow: "接收文件",
      receivedTitle: "按日期浏览",
      receivedDesc: "文件按传输日期分组。选择文件夹可直接在应用内查看接收文件列表。",
      closeViewer: "关闭接收目录查看器",
      folderEyebrow: "接收目录",
      folderContents: "目录内容",
      close: "关闭",
    },
    info: {
      eyebrow: "联系",
      title: "联系团队",
      desc: "请填写下方表单，我们的销售团队成员将针对你的业务需求与你联系。",
      fieldAudience: "你想联系谁？*",
      fieldSolution: "你关注的解决方案是？*",
      fieldFirstName: "名*",
      fieldLastName: "姓*",
      fieldEmail: "公司邮箱*",
      fieldCompany: "公司*",
      fieldJobTitle: "职位*",
      fieldPhone: "电话*",
      fieldCountry: "国家*",
      fieldState: "州或省",
      fieldAdditional: "补充信息",
      marketing: "向我发送 Broadcom 通信信息",
      policy:
        "我同意接收来自 Group-10 的商业信息。我理解我的个人数据将根据 Group-10 的隐私政策进行处理，并且我可随时取消邮件订阅。",
      submit: "提交",
      supportTitle: "联系支持",
      supportDesc: "如有客户服务或产品支持相关问题，请访问 Contact Support。",
      supportLink: "点击这里",
      pleaseSelect: "请选择...",
    },
    transfer: {
      failureNote: "请确认你已通过 Wi-Fi 连接到附近设备，然后重新开始传输。",
      chooseDateFirst: "请先选择有效的传输日期。",
      launchFailed: "接收器启动前发生错误，传输未开始。",
      noRealtimeEvents: "实时传输事件不可用，请重启应用后重试。",
      apiUnavailable: "传输 API 不可用，请重启应用以重新加载 preload 脚本。",
      rendererApiError: "渲染进程无法访问 window.appApi.filetransfer。",
      launchFailedFallback: "启动传输失败。",
      processExited: "进程已退出，退出码 {{code}}{{signal}}。",
      selectedDate: "所选日期：{{date}}",
      receivedDateRule: "每个输入日期都会映射到独立的接收目录。",
      receivedUdpRule: "UDP 客户端会将文件保存到 <Wi-Fi>_ReYYYYMMDD 目录，并追加 .dat 后缀。",
      datViewerSelect: "请选择一个 .dat 文件查看解析结果。",
      datViewerReading: "正在读取并解析文件...",
      datApiUnavailable: "Dat 解析 API 不可用，请重启应用后重试。",
      datParseFailed: "无法解析所选 .dat 文件。",
      datParserNoResponse: "Dat 解析器无响应。",
      datBrowserUnavailable: "接收文件浏览器不可用，请重启应用后重试。",
      datBrowserLoadFailed: "当前无法加载接收文件。",
      datFolderEmpty: "此目录中暂无 .dat 文件。",
      datFolderCardEmpty: "该目录当前为空。",
      openReceivedFor: "打开 {{date}} 的接收文件",
      showcaseFolder: "示例目录",
      protocolFolder: "{{protocol}} 目录",
      filesSummary: "{{count}} 个文件 | {{size}}",
      noReceivedFiles: "暂无接收文件。完成传输后会按日期显示在这里。",
      exampleDataTitle: "示例数据",
      exampleDataDesc: "应用内置的展示数据集，用于预览和演示。",
      wifiTransfersTitle: "{{wifi}} 接收记录",
      wifiTransfersDesc: "按日期分组展示设备传输得到的文件。",
      noActualFolders: "尚无真实接收目录，请先执行一次传输。",
      datNotFf: "分隔符不是 0xFF，此文件不包含 XYZ 采样数组。",
      noHighAlerts: "未检测到高值告警。",
      highAlertsTop: "高值告警前 {{count}} 项：",
      threshold: "阈值",
      pointsShort: "点",
      minimumShort: "最小",
      maximumShort: "最大",
      axisSuffix: "轴",
      chartSuffix: "数据图",
      sensors: "传感器",
      sampling: "采样",
      sampleSize: "样本数量",
      startTimestamp: "起始时间戳",
      sampleSize2: "样本数量2",
      trailingBytes: "尾部字节",
      count: "计数",
      mean: "平均值",
      median: "中位数",
      std: "标准差",
      thresholdLabel: "阈值",
      highAlerts: "高值告警",
      currentFileUnknown: "未知",
      currentFileWaiting: "等待中",
      currentFileDone: "完成",
      wifiNeedConnectFirst: "请先成功连接到附近 ESP Wi-Fi，再点击确认。",
    },
    wifi: {
      scanning: "正在扫描 Wi-Fi...",
      scanningNearby: "正在扫描附近 ESP-* 网络...",
      scanButton: "扫描 Wi-Fi",
      networkPending: "已发现 {{ssid}}。点击此卡片后可输入密码或使用已保存配置连接。",
      apiUnavailable: "渲染进程无法访问 Wi-Fi API，请重启应用。",
      scanFailed: "扫描 Wi-Fi 网络失败。",
      usingLastKnown: "使用上一次检测到的 {{ssid}}。扫描告警：{{error}}",
      adapterEnabledPrefix: "Wi-Fi 适配器已启用。 ",
      detectedMultiple: "检测到 {{count}} 个 ESP 网络。请点击绿色卡片继续。",
      detectedSingle: "已检测到 {{ssid}}。点击卡片即可连接。",
      noEspFound: "尚未发现 ESP-* 网络，请将设备放近后等待刷新。",
      noEspKeepLast: "本次扫描未发现 ESP 网络，继续保留上次检测到的 {{ssid}}。",
      scanExceptionKeep: "扫描异常，继续保留 {{ssid}}。{{error}}",
      noEspDetected: "请等待检测到 ESP-* 网络后再操作。",
      connectApiUnavailable: "Wi-Fi 连接 API 不可用，请重启应用后重试。",
      connectingSaved: "正在尝试使用已保存配置连接 {{ssid}}...",
      connectingPassword: "正在尝试连接 {{ssid}}...",
      connected: "已连接到 {{ssid}}。",
      connectFailedSaved: "{{ssid}} 的已保存配置连接失败，可输入密码重试。",
      connectFailedWithError: "{{message}} 请检查密码与设备距离后重试。",
      connectFailed: "连接失败，请检查密码和信号后重试。",
    },
    mode: {
      tcp: {
        status: "TCP 已连接流程",
        title: "TCP 命令流",
        queueTitle: "请求序列",
        pendingText: "请选择日期，然后启动 Python TCP 接收器。",
        runningText: "正在运行 Python TCP 接收器...",
        successText: "TCP 传输完成。",
        failText: "TCP 传输失败。请查看下方错误输出。",
        launchLabel: "正在启动 TCP 传输任务...",
        commands: [
          ["0x11", "请求 DK", "首个日期批次前的初始化握手。"],
          ["0x12", "接收 DK", "从服务端读取固定 32 字节密钥块。"],
          ["0x02", "文件数量", "接收所选日期的文件总数。"],
          ["0x03", "文件载荷", "读取文件名和大小，并按块写入数据流。"],
          ["0x04", "文件结束", "标记当前日期批次结束。"],
        ],
      },
      udp: {
        status: "UDP 数据包流程",
        title: "UDP 包序列",
        queueTitle: "批次发现",
        pendingText: "请选择日期，然后启动 Python UDP 接收器。",
        runningText: "正在运行 Python UDP 接收器...",
        successText: "UDP 传输完成。",
        failText: "UDP 传输失败。请查看下方错误输出。",
        launchLabel: "正在启动 UDP 传输任务...",
        commands: [
          ["0x01", "HELLO", "开启会话并等待 HELLO_RSP。"],
          ["0x20", "列文件", "按日期及可选 since 游标枚举文件。"],
          ["0x30", "取文件", "请求文件并协商块大小。"],
          ["0x32", "数据", "按序列号与偏移字段传输数据包。"],
          ["0x33", "确认", "对每个接收包回传 ACK。"],
          ["0x34", "文件结束", "结束单个文件并在可用时校验 CRC。"],
        ],
      },
    },
  },
};

let currentLanguage = getPersistedLanguage();

const TRANSFER_MODES = {
  tcp: {
    endpoint: "192.168.4.1:27050",
    folderRule: "<Wi-Fi>_REYYYYMMDD",
    metrics: {
      transport: "TCP",
      read: "8192 B",
      block: "32768 B",
      finish: "0x21",
    },
  },
  udp: {
    endpoint: "192.168.4.1:6000",
    folderRule: "<Wi-Fi>_ReYYYYMMDD",
    metrics: {
      transport: "UDP",
      read: "4096 B",
      block: "1450 B",
      finish: "MSG_FILE_END",
    },
  },
};

let currentTransferMode = "tcp";
let transferStreamBuffer = "";
let transferLogLines = [];
let transferLiveLine = "";
let transferRuntime = {
  filesCount: 0,
  completedFiles: 0,
  retries: 0,
};
let receivedTransferFolders = [];
let activeReceivedFolder = "";
let activeReceivedFileName = "";
let receivedViewerRequestId = 0;
let wifiReadyScanTimer = 0;
let wifiReadySsid = "";
let wifiReadyNetworks = [];
let wifiReadySelectionLocked = false;
let wifiReadyConnected = false;
let wifiReadyScanning = false;
let wifiReadyConnecting = false;

function getPersistedLanguage() {
  try {
    const value = (window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || "").trim().toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(value)) {
      return value;
    }
  } catch (_error) {
  }
  return DEFAULT_LANGUAGE;
}

function persistLanguage(language) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (_error) {
  }
}

function resolveText(language, key) {
  const source = I18N[language] || I18N[DEFAULT_LANGUAGE];
  return key.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), source);
}

function tr(key, variables = {}) {
  const fallback = resolveText(DEFAULT_LANGUAGE, key);
  const template = resolveText(currentLanguage, key);
  const text = typeof template === "string" ? template : (typeof fallback === "string" ? fallback : key);

  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_all, name) => {
    if (Object.prototype.hasOwnProperty.call(variables, name)) {
      return String(variables[name]);
    }
    return "";
  });
}

function getModeText(modeKey) {
  const fallback = resolveText(DEFAULT_LANGUAGE, `mode.${modeKey}`) || {};
  const localized = resolveText(currentLanguage, `mode.${modeKey}`) || {};
  return {
    ...fallback,
    ...localized,
  };
}

function applyI18nToDom() {
  document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : "en";

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (!key) {
      return;
    }
    node.textContent = tr(key);
  });

  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    const key = node.getAttribute("data-i18n-title");
    if (!key) {
      return;
    }
    node.setAttribute("title", tr(key));
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    const key = node.getAttribute("data-i18n-aria-label");
    if (!key) {
      return;
    }
    node.setAttribute("aria-label", tr(key));
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const key = node.getAttribute("data-i18n-placeholder");
    if (!key) {
      return;
    }
    node.setAttribute("placeholder", tr(key));
  });

  if (languageToggleIcon) {
    languageToggleIcon.textContent = tr("nav.languageIcon");
  }
  if (languageToggleText) {
    languageToggleText.textContent = tr("nav.languageNext");
  }
  if (languageToggleButton) {
    languageToggleButton.setAttribute("title", tr("nav.languageTitle"));
    languageToggleButton.setAttribute("aria-label", tr("nav.languageTitle"));
  }
}

function toggleLanguage() {
  currentLanguage = currentLanguage === "en" ? "zh" : "en";
  persistLanguage(currentLanguage);
  applyI18nToDom();
  renderActiveNavigation();
  renderTransferMode(currentTransferMode);
  if (receivedBrowser) {
    renderReceivedTransferBrowser();
  }
  if (receivedFolderModal && !receivedFolderModal.hidden) {
    renderReceivedFolderModal();
  }
  if (wifiReadyList && wifiReadyButton && wifiReadyLabel) {
    renderWifiReadyCards({
      showScanning: !wifiReadyNetworks.length,
      scanningLabel: tr("wifi.scanning"),
      disabled: wifiReadyConnecting,
      connecting: wifiReadyConnecting,
      connected: wifiReadyConnected,
    });
  }
  if (receivedFileViewer && !activeReceivedFileName) {
    renderReceivedViewerMessage("received-viewer-empty", tr("transfer.datViewerSelect"));
  }
}

function bindLanguageToggle() {
  if (!languageToggleButton) {
    return;
  }

  languageToggleButton.addEventListener("click", () => {
    toggleLanguage();
  });
}

function getPersistedWifiName() {
  try {
    const value = window.localStorage.getItem(ACTIVE_WIFI_STORAGE_KEY) || "";
    return value.trim();
  } catch (_error) {
    return "";
  }
}

function persistWifiName(value) {
  const safe = String(value || "").trim();
  if (!safe) {
    return;
  }
  try {
    window.localStorage.setItem(ACTIVE_WIFI_STORAGE_KEY, safe);
  } catch (_error) {
  }
}

function renderActiveNavigation() {
  const currentPage = document.body.dataset.currentPage;

  navButtons.forEach((button) => {
    const isActive = button.dataset.pageLink === currentPage;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

function bindHomeWebview() {
  if (!homeWebview) {
    return;
  }

  homeWebview.addEventListener("dom-ready", () => {
  });

  homeWebview.addEventListener("did-fail-load", () => {
    console.error("Google page could not be loaded in the embedded view.");
  });
}

function setWifiReadyStatus(text, tone = "") {
  if (!wifiReadyStatus) {
    return;
  }

  wifiReadyStatus.textContent = text || "";
  wifiReadyStatus.classList.toggle("is-success", tone === "success");
  wifiReadyStatus.classList.toggle("is-error", tone === "error");
}

function setReadyConfirmState(connected) {
  if (!readyConfirmButton) {
    return;
  }

  const enabled = Boolean(connected);
  readyConfirmButton.classList.toggle("is-disabled", !enabled);
  readyConfirmButton.setAttribute("aria-disabled", enabled ? "false" : "true");
}

function setWifiInputControlsDisabled(disabled) {
  const isDisabled = Boolean(disabled);
  if (wifiPasswordInput) {
    wifiPasswordInput.disabled = isDisabled;
  }
  if (wifiConnectSubmit) {
    wifiConnectSubmit.disabled = isDisabled;
  }
  if (wifiConnectSaved) {
    wifiConnectSaved.disabled = isDisabled;
  }
}

function setWifiReadyButton(options) {
  if (!wifiReadyButton || !wifiReadyLabel) {
    return;
  }

  const {
    label = tr("wifi.scanning"),
    found = false,
    pulsing = false,
    connecting = false,
    connected = false,
    disabled = false,
  } = options || {};

  wifiReadyLabel.textContent = label;
  wifiReadyButton.disabled = Boolean(disabled);
  wifiReadyButton.classList.toggle("is-found", Boolean(found));
  wifiReadyButton.classList.toggle("is-pulsing", Boolean(pulsing));
  wifiReadyButton.classList.toggle("is-connecting", Boolean(connecting));
  wifiReadyButton.classList.toggle("is-connected", Boolean(connected));
}

function createWifiReadyCard(network, options = {}) {
  const {
    selected = false,
    selectionLocked = false,
    disabled = false,
    connecting = false,
    connected = false,
    onClick = null,
  } = options;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "wifi-ready-button";
  button.disabled = Boolean(disabled);
  button.setAttribute("aria-expanded", selected && wifiConnectForm && !wifiConnectForm.hidden ? "true" : "false");

  if (connected && selected) {
    button.classList.add("is-connected", "is-active");
  } else if (connecting && selected) {
    button.classList.add("is-connecting", "is-active");
  } else {
    if (selected || !selectionLocked) {
      button.classList.add("is-found", "is-pulsing");
    }
    if (selected) {
      button.classList.add("is-active");
    }
  }

  const icon = document.createElement("span");
  icon.className = "wifi-ready-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M2.2 8.8a15.3 15.3 0 0 1 19.6 0" /><path d="M5.9 12.5a10 10 0 0 1 12.2 0" /><path d="M9.6 16.2a4.7 4.7 0 0 1 4.8 0" /><circle cx="12" cy="19.3" r="1.3" /></svg>';

  const label = document.createElement("span");
  label.className = "wifi-ready-name";
  if (connecting && selected) {
    label.textContent = tr("wifi.connectingPassword", { ssid: network.ssid });
  } else {
    label.textContent = network.ssid;
  }

  button.append(icon, label);
  if (typeof onClick === "function") {
    button.addEventListener("click", onClick);
  }

  return button;
}

function renderWifiReadyCards(options = {}) {
  if (!wifiReadyList || !wifiReadyButton || !wifiReadyLabel) {
    return;
  }

  const {
    showScanning = false,
    scanningLabel = tr("wifi.scanning"),
    disabled = false,
    connecting = false,
    connected = false,
  } = options;

  if (showScanning || !Array.isArray(wifiReadyNetworks) || !wifiReadyNetworks.length) {
    wifiReadyList.replaceChildren(wifiReadyButton);
    setWifiReadyButton({
      label: scanningLabel,
      found: false,
      pulsing: false,
      connecting: false,
      connected: false,
      disabled,
    });
    return;
  }

  const cards = [];
  wifiReadyNetworks.forEach((network) => {
    const isSelected = network.ssid === wifiReadySsid;
    const card = createWifiReadyCard(network, {
      selected: isSelected,
      disabled,
      connecting,
      connected,
      onClick: () => {
        const changed = wifiReadySsid !== network.ssid;
        wifiReadySsid = network.ssid;
        wifiReadySelectionLocked = true;
        if (changed || !wifiReadyConnected) {
          wifiReadyConnected = false;
          setReadyConfirmState(false);
        }
        renderWifiReadyCards({
          showScanning: false,
          disabled: false,
          connecting: false,
          connected: false,
        });
        if (wifiConnectForm && wifiConnectForm.hidden) {
          showWifiConnectForm();
        }
        setWifiReadyStatus(tr("wifi.networkPending", { ssid: wifiReadySsid }));
      },
      selectionLocked: wifiReadySelectionLocked,
    });
    cards.push(card);
  });

  wifiReadyList.replaceChildren(...cards);
}

function scheduleWifiScan(delayMs = 5000) {
  if (wifiReadyScanTimer) {
    window.clearTimeout(wifiReadyScanTimer);
  }

  wifiReadyScanTimer = window.setTimeout(() => {
    void scanReadyCheckWifi({ silent: true });
  }, delayMs);
}

function hideWifiConnectForm() {
  if (!wifiConnectForm || !wifiReadyButton) {
    return;
  }

  wifiConnectForm.hidden = true;
  wifiReadyButton.setAttribute("aria-expanded", "false");
}

function showWifiConnectForm() {
  if (!wifiConnectForm || !wifiReadyButton) {
    return;
  }

  renderWifiReadyCards({
    showScanning: false,
    disabled: false,
    connecting: wifiReadyConnecting,
    connected: false,
  });
  wifiConnectForm.hidden = false;
  wifiReadyButton.setAttribute("aria-expanded", "true");
  if (wifiPasswordInput) {
    wifiPasswordInput.focus();
  }
}

async function scanReadyCheckWifi(options = {}) {
  if (!wifiReadyButton || !wifiReadyLabel || !wifiReadyStatus) {
    return;
  }

  if (wifiReadyScanning || wifiReadyConnecting) {
    return;
  }

  const { silent = false } = options;
  wifiReadyScanning = true;

  if (!silent) {
    renderWifiReadyCards({
      showScanning: true,
      scanningLabel: tr("wifi.scanning"),
      disabled: true,
    });
    setWifiReadyStatus(tr("wifi.scanningNearby"));
  }

  if (!filetransferApi || typeof filetransferApi.scanWifi !== "function") {
    renderWifiReadyCards({
      showScanning: true,
      scanningLabel: tr("wifi.apiUnavailable"),
      disabled: true,
    });
    setWifiReadyStatus(tr("wifi.apiUnavailable"), "error");
    wifiReadyScanning = false;
    return;
  }

  try {
    const result = await filetransferApi.scanWifi();

    if (!result || !result.ok) {
      const errorText = result && result.error ? result.error : tr("wifi.scanFailed");
      const hasLastKnown = Boolean(wifiReadySsid);
      wifiReadyNetworks = hasLastKnown
        ? [{ ssid: wifiReadySsid, signal: 0, stale: true }]
        : [];

      if (hasLastKnown) {
        renderWifiReadyCards({
          showScanning: false,
          disabled: false,
          connecting: false,
          connected: false,
        });
        setWifiReadyStatus(
          tr("wifi.usingLastKnown", { ssid: wifiReadySsid, error: errorText }),
          "error",
        );
        scheduleWifiScan(7000);
        return;
      }

      renderWifiReadyCards({
        showScanning: true,
        scanningLabel: tr("wifi.scanButton"),
        disabled: false,
      });
      setWifiReadyStatus(errorText, "error");
      scheduleWifiScan(7000);
      return;
    }

    const networkCandidates = Array.isArray(result.networks)
      ? result.networks.filter((network) => network && network.ssid)
      : [];
    wifiReadyNetworks = networkCandidates;

    if (wifiReadySsid && !wifiReadyNetworks.some((item) => item.ssid === wifiReadySsid)) {
      wifiReadySsid = "";
      wifiReadySelectionLocked = false;
      wifiReadyConnected = false;
      setReadyConfirmState(false);
    }

    if (!wifiReadySsid && wifiReadyNetworks.length) {
      const persisted = getPersistedWifiName();
      const matchedPersisted = wifiReadyNetworks.find((item) => item.ssid === persisted);
      wifiReadySsid = matchedPersisted ? matchedPersisted.ssid : wifiReadyNetworks[0].ssid;
      wifiReadySelectionLocked = false;
      wifiReadyConnected = false;
      setReadyConfirmState(false);
    }

    const bestNetwork = wifiReadyNetworks.find((item) => item.ssid === wifiReadySsid)
      || wifiReadyNetworks[0]
      || null;

    if (bestNetwork) {
      renderWifiReadyCards({
        showScanning: false,
        disabled: false,
        connecting: false,
        connected: false,
      });

      const prefix = result.requestedEnable
        ? tr("wifi.adapterEnabledPrefix")
        : "";
      const networkCount = wifiReadyNetworks.length;
      const networkHint =
        networkCount > 1
          ? tr("wifi.detectedMultiple", { count: networkCount })
          : tr("wifi.detectedSingle", { ssid: wifiReadySsid });
      setWifiReadyStatus(
        `${prefix}${networkHint}`,
        "success",
      );
      scheduleWifiScan(12000);
      return;
    }

    if (wifiReadySsid) {
      wifiReadyNetworks = [{ ssid: wifiReadySsid, signal: 0, stale: true }];
      renderWifiReadyCards({
        showScanning: false,
        disabled: false,
        connecting: false,
        connected: false,
      });
      setWifiReadyStatus(
        tr("wifi.noEspKeepLast", { ssid: wifiReadySsid }),
      );
      scheduleWifiScan(5000);
      return;
    }

    wifiReadyNetworks = [];
    wifiReadyConnected = false;
    setReadyConfirmState(false);
    hideWifiConnectForm();
    renderWifiReadyCards({
      showScanning: true,
      scanningLabel: tr("wifi.scanning"),
      disabled: false,
    });
    setWifiReadyStatus(tr("wifi.noEspFound"));
    scheduleWifiScan(5000);
  } catch (error) {
    console.error(error);
    if (wifiReadySsid) {
      wifiReadyNetworks = [{ ssid: wifiReadySsid, signal: 0, stale: true }];
      renderWifiReadyCards({
        showScanning: false,
        disabled: false,
        connecting: false,
        connected: false,
      });
      setWifiReadyStatus(
        tr("wifi.scanExceptionKeep", {
          ssid: wifiReadySsid,
          error: error && error.message ? error.message : "",
        }),
        "error",
      );
      scheduleWifiScan(7000);
      return;
    }

    wifiReadyNetworks = [];
    wifiReadyConnected = false;
    setReadyConfirmState(false);
    renderWifiReadyCards({
      showScanning: true,
      scanningLabel: tr("wifi.scanButton"),
      disabled: false,
    });
    setWifiReadyStatus(
      error && error.message ? error.message : tr("wifi.scanFailed"),
      "error",
    );
    scheduleWifiScan(7000);
  } finally {
    wifiReadyScanning = false;
  }
}

async function connectReadyWifi(options = {}) {
  if (!wifiReadySsid) {
    setWifiReadyStatus(tr("wifi.noEspDetected"), "error");
    return;
  }

  if (!wifiPasswordInput) {
    return;
  }

  const { useSavedProfile = false } = options;
  const password = useSavedProfile ? "" : wifiPasswordInput.value.trim();

  if (!filetransferApi || typeof filetransferApi.connectWifi !== "function") {
    setWifiReadyStatus(tr("wifi.connectApiUnavailable"), "error");
    return;
  }

  wifiReadyConnecting = true;
  wifiReadyConnected = false;
  setReadyConfirmState(false);
  setWifiInputControlsDisabled(true);
  renderWifiReadyCards({
    showScanning: false,
    disabled: true,
    connecting: true,
    connected: false,
  });
  if (useSavedProfile || !password) {
    setWifiReadyStatus(tr("wifi.connectingSaved", { ssid: wifiReadySsid }));
  } else {
    setWifiReadyStatus(tr("wifi.connectingPassword", { ssid: wifiReadySsid }));
  }

  try {
    const result = await filetransferApi.connectWifi({
      ssid: wifiReadySsid,
      password,
    });

    if (!result || !result.ok) {
      const errorText = result && result.error ? result.error : tr("wifi.connectFailed");
      wifiReadyConnected = false;
      setReadyConfirmState(false);
      renderWifiReadyCards({
        showScanning: false,
        disabled: false,
        connecting: false,
        connected: false,
      });
      setWifiReadyStatus(errorText, "error");
      return;
    }

    hideWifiConnectForm();
    wifiPasswordInput.value = "";
    wifiReadyConnected = true;
    persistWifiName(wifiReadySsid);
    setReadyConfirmState(true);
    renderWifiReadyCards({
      showScanning: false,
      disabled: false,
      connecting: false,
      connected: true,
    });
    setWifiReadyStatus(result.message || tr("wifi.connected", { ssid: wifiReadySsid }), "success");
  } catch (error) {
    console.error(error);
    wifiReadyConnected = false;
    setReadyConfirmState(false);
    renderWifiReadyCards({
      showScanning: !wifiReadySsid,
      scanningLabel: wifiReadySsid ? tr("wifi.scanning") : tr("wifi.scanButton"),
      disabled: false,
      connecting: false,
      connected: false,
    });
    setWifiReadyStatus(
      error && error.message ? error.message : tr("wifi.connectFailed"),
      "error",
    );
  } finally {
    wifiReadyConnecting = false;
    setWifiInputControlsDisabled(false);
  }
}

function bindReadyCheckWifi() {
  if (!wifiReadyButton || !wifiReadyLabel || !wifiReadyStatus) {
    return;
  }

  setReadyConfirmState(false);

  wifiReadyButton.addEventListener("click", () => {
    if (!wifiReadySsid) {
      void scanReadyCheckWifi();
      return;
    }

    if (!wifiConnectForm) {
      return;
    }

    if (wifiConnectForm.hidden) {
      showWifiConnectForm();
    } else {
      hideWifiConnectForm();
    }
  });

  if (wifiConnectForm) {
    wifiConnectForm.addEventListener("submit", (event) => {
      event.preventDefault();
      void connectReadyWifi({ useSavedProfile: false });
    });
  }

  if (wifiConnectSaved) {
    wifiConnectSaved.addEventListener("click", () => {
      void connectReadyWifi({ useSavedProfile: true });
    });
  }

  if (readyConfirmButton) {
    readyConfirmButton.addEventListener("click", (event) => {
      if (readyConfirmButton.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
        setWifiReadyStatus(tr("transfer.wifiNeedConnectFirst"), "error");
      }
    });
  }

  window.addEventListener("beforeunload", () => {
    if (wifiReadyScanTimer) {
      window.clearTimeout(wifiReadyScanTimer);
      wifiReadyScanTimer = 0;
    }
  });

  void scanReadyCheckWifi();
}

function renderMetricValue(id, value) {
  const target = document.getElementById(id);
  if (target) {
    target.textContent = value;
  }
}

function renderProtocolCommands(commands) {
  if (!protocolCommands) {
    return;
  }

  protocolCommands.replaceChildren();

  commands.forEach(([code, title, description]) => {
    const item = document.createElement("div");
    item.className = "command-item";

    const codeNode = document.createElement("span");
    codeNode.className = "command-code";
    codeNode.textContent = code;

    const body = document.createElement("div");
    const titleNode = document.createElement("strong");
    titleNode.textContent = title;
    const descriptionNode = document.createElement("p");
    descriptionNode.textContent = description;

    body.append(titleNode, descriptionNode);
    item.append(codeNode, body);
    protocolCommands.append(item);
  });
}

function renderTransferMode(modeKey) {
  const mode = TRANSFER_MODES[modeKey];
  const modeText = getModeText(modeKey);

  if (!mode) {
    return;
  }

  currentTransferMode = modeKey;

  if (protocolEndpoint) {
    protocolEndpoint.textContent = mode.endpoint;
  }

  if (protocolStatus) {
    protocolStatus.textContent = modeText.status;
  }

  if (protocolTitle) {
    protocolTitle.textContent = modeText.title;
  }

  if (queueTitle) {
    queueTitle.textContent = modeText.queueTitle;
  }

  if (folderRule) {
    folderRule.textContent = mode.folderRule;
  }

  if (folderCopy) {
    folderCopy.textContent = modeKey === "udp"
      ? tr("transfer.receivedUdpRule")
      : tr("transfer.receivedDateRule");
  }

  renderMetricValue("metric-transport", mode.metrics.transport);
  renderMetricValue("metric-read", mode.metrics.read);
  renderMetricValue("metric-block", mode.metrics.block);
  renderMetricValue("metric-finish", mode.metrics.finish);
  renderProtocolCommands(modeText.commands || []);
  setTransferHelpNote("");
  setTransferLogCollapsed(true);

  if (transferActionStatus) {
    transferActionStatus.textContent = modeText.pendingText;
  }
}

function getDefaultTransferDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeTransferDateInput(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 8 ? digits : "";
}

function formatBytes(value) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let amount = Number(value) || 0;
  let index = 0;

  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index += 1;
  }

  if (amount >= 100 || index === 0) {
    return `${amount.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  }

  return `${amount.toFixed(2)} ${units[index]}`;
}

function formatSpeed(bytesPerSecond) {
  const rate = Number(bytesPerSecond) || 0;
  return `${formatBytes(rate)}/s`;
}

function formatDuration(seconds) {
  const total = Number(seconds) || 0;
  return `${total.toFixed(1)} s`;
}

function appendTransferLog(text) {
  applyTransferConsoleText(text);
}

function setTransferLogCollapsed(collapsed) {
  if (!transferLog) {
    return;
  }

  transferLog.classList.toggle("is-collapsed", collapsed);
}

function setTransferHelpNote(text) {
  if (!transferHelpNote) {
    return;
  }

  const content = text || "";
  transferHelpNote.textContent = content;
  transferHelpNote.classList.toggle("is-visible", Boolean(content));
}

function setTransferDetailsExpanded(expanded) {
  if (!transferGrid || !transferDetailsToggle) {
    return;
  }

  transferGrid.classList.toggle("is-details-collapsed", !expanded);
  transferDetailsToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
}

function renderReceivedBrowserMessage(className, text) {
  if (!receivedBrowser) {
    return;
  }

  receivedBrowser.replaceChildren();

  const message = document.createElement("p");
  message.className = className;
  message.textContent = text;
  receivedBrowser.append(message);
}

function createReceivedFolderCard(folder) {
  const card = document.createElement("article");
  card.className = "received-folder-card";
  if (folder.isSpecial) {
    card.classList.add("is-special-row");
  }

  const trigger = document.createElement("button");
  trigger.className = "received-folder-button";
  trigger.type = "button";
  trigger.setAttribute(
    "aria-label",
    tr("transfer.openReceivedFor", { date: folder.dateLabel }),
  );

  const icon = document.createElement("span");
  icon.className = "received-folder-icon";
  icon.textContent = String(folder.fileCount);

  const meta = document.createElement("div");
  meta.className = "received-folder-meta";

  const date = document.createElement("strong");
  date.className = "received-folder-date";
  date.textContent = folder.dateLabel;

  const type = document.createElement("span");
  type.className = "received-folder-type";
  type.textContent = folder.isSpecial
    ? tr("transfer.showcaseFolder")
    : tr("transfer.protocolFolder", { protocol: folder.protocolHint });

  const size = document.createElement("span");
  size.className = "received-folder-size";
  size.textContent = tr("transfer.filesSummary", {
    count: folder.fileCount,
    size: formatBytes(folder.totalBytes),
  });

  meta.append(date, type, size);
  trigger.append(icon, meta);
  trigger.addEventListener("click", () => {
    openReceivedFolderModal(folder.folderName);
  });
  card.append(trigger);

  return card;
}

function createReceivedSection(title, subtitle, folders, extraClassName = "") {
  const section = document.createElement("section");
  section.className = `received-section${extraClassName ? ` ${extraClassName}` : ""}`;

  const head = document.createElement("header");
  head.className = "received-section-head";

  const heading = document.createElement("h4");
  heading.className = "received-section-title";
  heading.textContent = title;

  const copy = document.createElement("p");
  copy.className = "received-section-copy";
  copy.textContent = subtitle;

  const grid = document.createElement("div");
  grid.className = "received-folder-grid";

  folders.forEach((folder) => {
    grid.append(createReceivedFolderCard(folder));
  });

  head.append(heading, copy);
  section.append(head, grid);
  return section;
}

function renderReceivedTransferBrowser() {
  if (!receivedBrowser) {
    return;
  }

  receivedBrowser.replaceChildren();

  const specialFolders = receivedTransferFolders.filter((folder) => folder.isSpecial);
  const regularFolders = receivedTransferFolders.filter((folder) => !folder.isSpecial);

  if (!specialFolders.length && !regularFolders.length) {
    renderReceivedBrowserMessage(
      "received-empty",
      tr("transfer.noReceivedFiles"),
    );
    return;
  }

  if (specialFolders.length) {
    receivedBrowser.append(
      createReceivedSection(
        tr("transfer.exampleDataTitle"),
        tr("transfer.exampleDataDesc"),
        specialFolders,
        "is-special",
      ),
    );
  }

  if (regularFolders.length) {
    const groupedByWifi = new Map();
    regularFolders.forEach((folder) => {
      const wifiName =
        typeof folder.wifiName === "string" && folder.wifiName.trim()
          ? folder.wifiName.trim()
          : DEFAULT_TRANSFER_WIFI_NAME;

      if (!groupedByWifi.has(wifiName)) {
        groupedByWifi.set(wifiName, []);
      }
      groupedByWifi.get(wifiName).push(folder);
    });

    groupedByWifi.forEach((folders, wifiName) => {
      receivedBrowser.append(
        createReceivedSection(
          tr("transfer.wifiTransfersTitle", { wifi: wifiName }),
          tr("transfer.wifiTransfersDesc"),
          folders,
        ),
      );
    });
    return;
  }

  const empty = document.createElement("p");
  empty.className = "received-empty";
  empty.textContent = tr("transfer.noActualFolders");
  receivedBrowser.append(empty);
}

function findReceivedFolder(folderName) {
  return receivedTransferFolders.find((folder) => folder.folderName === folderName) || null;
}

function formatViewerNumber(value, fractionDigits = 3) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "N/A";
  }
  return numeric.toFixed(fractionDigits);
}

function renderReceivedViewerMessage(className, text) {
  if (!receivedFileViewer) {
    return;
  }

  receivedFileViewer.replaceChildren();
  const message = document.createElement("p");
  message.className = className;
  message.textContent = text;
  receivedFileViewer.append(message);
}

function createViewerGrid(items) {
  const grid = document.createElement("div");
  grid.className = "received-viewer-grid";

  items.forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "received-viewer-item";

    const key = document.createElement("span");
    key.textContent = label;

    const data = document.createElement("strong");
    data.textContent = value;

    item.append(key, data);
    grid.append(item);
  });

  return grid;
}

function downsampleSeries(values, maxPoints = 420) {
  if (!Array.isArray(values) || !values.length) {
    return [];
  }

  if (values.length <= maxPoints) {
    return values
      .map((value, index) => ({ index, value: Number(value) }))
      .filter((point) => Number.isFinite(point.value));
  }

  const step = values.length / maxPoints;
  const points = [];

  for (let slot = 0; slot < maxPoints; slot += 1) {
    const sourceIndex = Math.min(values.length - 1, Math.floor((slot + 0.5) * step));
    const value = Number(values[sourceIndex]);
    if (Number.isFinite(value)) {
      points.push({ index: sourceIndex, value });
    }
  }

  return points;
}

function drawAxisChart(canvas, axisData) {
  const rawValues = axisData && Array.isArray(axisData.values) ? axisData.values : [];
  const points = downsampleSeries(rawValues);
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(360, Math.floor(rect.width || 640));
  const cssHeight = Math.max(160, Math.floor(rect.height || 190));
  const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(cssWidth * pixelRatio);
  canvas.height = Math.floor(cssHeight * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);

  if (!points.length) {
    context.fillStyle = "#6f87a0";
    context.font = "600 14px 'Segoe UI', sans-serif";
    context.fillText("No sample points in this file.", 14, 28);
    return;
  }

  const threshold = Number(axisData && axisData.threshold);
  const valuesOnly = points.map((point) => point.value);
  let minValue = Math.min(...valuesOnly);
  let maxValue = Math.max(...valuesOnly);

  if (Number.isFinite(threshold)) {
    minValue = Math.min(minValue, threshold);
    maxValue = Math.max(maxValue, threshold);
  }

  if (minValue === maxValue) {
    minValue -= 1;
    maxValue += 1;
  }

  const padding = { top: 14, right: 12, bottom: 20, left: 52 };
  const chartWidth = cssWidth - padding.left - padding.right;
  const chartHeight = cssHeight - padding.top - padding.bottom;
  const toY = (value) => {
    const ratio = (value - minValue) / (maxValue - minValue);
    return padding.top + chartHeight - ratio * chartHeight;
  };

  context.strokeStyle = "rgba(104, 136, 168, 0.28)";
  context.lineWidth = 1;
  for (let tick = 0; tick <= 4; tick += 1) {
    const y = padding.top + (chartHeight / 4) * tick;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(padding.left + chartWidth, y);
    context.stroke();

    const labelValue = maxValue - ((maxValue - minValue) / 4) * tick;
    context.fillStyle = "#6f87a0";
    context.font = "600 11px 'Segoe UI', sans-serif";
    context.fillText(labelValue.toFixed(1), 8, y + 4);
  }

  if (Number.isFinite(threshold)) {
    const thresholdY = toY(threshold);
    context.save();
    context.setLineDash([7, 5]);
    context.strokeStyle = "rgba(218, 89, 89, 0.88)";
    context.beginPath();
    context.moveTo(padding.left, thresholdY);
    context.lineTo(padding.left + chartWidth, thresholdY);
    context.stroke();
    context.restore();

    context.fillStyle = "#c44747";
    context.font = "700 11px 'Segoe UI', sans-serif";
    context.fillText(tr("transfer.threshold"), padding.left + 8, Math.max(12, thresholdY - 7));
  }

  context.strokeStyle = "#2f78b7";
  context.lineWidth = 2;
  context.beginPath();
  points.forEach((point, index) => {
    const x =
      points.length === 1
        ? padding.left
        : padding.left + (chartWidth * index) / (points.length - 1);
    const y = toY(point.value);
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();

  if (Number.isFinite(threshold) && Array.isArray(axisData.highAlerts) && axisData.highAlerts.length) {
    const maxIndex = Math.max(1, rawValues.length - 1);
    context.fillStyle = "#da5959";
    axisData.highAlerts.forEach((alert) => {
      const x = padding.left + (chartWidth * Number(alert.index || 0)) / maxIndex;
      const y = toY(Number(alert.value || 0));
      context.beginPath();
      context.arc(x, y, 3.2, 0, Math.PI * 2);
      context.fill();
    });
  }
}

function createAxisChart(axisLabel, axisData) {
  const panel = document.createElement("div");
  panel.className = "received-axis-chart";

  const head = document.createElement("div");
  head.className = "received-axis-chart-head";

  const title = document.createElement("span");
  title.className = "received-axis-chart-title";
  title.textContent = `${axisLabel} ${tr("transfer.chartSuffix")}`;

  const meta = document.createElement("span");
  meta.className = "received-axis-chart-meta";
  meta.textContent =
    `${axisData.count} ${tr("transfer.pointsShort")} | ${tr("transfer.minimumShort")} ${formatViewerNumber(axisData.min)} | ${tr("transfer.maximumShort")} ${formatViewerNumber(axisData.max)}`;

  const canvas = document.createElement("canvas");
  canvas.className = "received-axis-canvas";
  canvas.setAttribute("aria-label", `${axisLabel} axis chart`);

  head.append(title, meta);
  panel.append(head, canvas);

  requestAnimationFrame(() => {
    drawAxisChart(canvas, axisData);
  });

  return panel;
}

function renderAxisSection(axisLabel, axisData) {
  const section = document.createElement("section");
  section.className = "received-viewer-section";

  const heading = document.createElement("h5");
  heading.textContent = `${axisLabel} ${tr("transfer.axisSuffix")}`;
  section.append(heading);

  section.append(
    createViewerGrid([
      [tr("transfer.count"), String(axisData.count)],
      [tr("transfer.mean"), formatViewerNumber(axisData.mean)],
      [tr("transfer.median"), formatViewerNumber(axisData.median)],
      [tr("transfer.std"), formatViewerNumber(axisData.std)],
      [tr("transfer.thresholdLabel"), formatViewerNumber(axisData.threshold)],
      [tr("transfer.highAlerts"), String(axisData.highCount)],
    ]),
  );

  const alertText = document.createElement("p");
  alertText.className = "received-viewer-note";
  section.append(alertText);

  if (!axisData.highCount || !Array.isArray(axisData.highAlerts) || !axisData.highAlerts.length) {
    alertText.textContent = tr("transfer.noHighAlerts");
    section.append(createAxisChart(axisLabel, axisData));
    return section;
  }

  alertText.textContent = tr("transfer.highAlertsTop", { count: axisData.highAlerts.length });

  const alerts = document.createElement("ul");
  alerts.className = "received-viewer-alerts";
  axisData.highAlerts.forEach((entry) => {
    const line = document.createElement("li");
    line.textContent = `idx ${entry.index} = ${entry.value}`;
    alerts.append(line);
  });
  section.append(alerts, createAxisChart(axisLabel, axisData));

  return section;
}

function renderReceivedDatViewer(payload) {
  if (!receivedFileViewer) {
    return;
  }

  receivedFileViewer.replaceChildren();

  const title = document.createElement("h4");
  title.className = "received-viewer-title";
  title.textContent = payload.file.fileName;
  receivedFileViewer.append(title);

  const utcLine = document.createElement("p");
  utcLine.className = "received-viewer-line";
  utcLine.textContent = payload.header.utcLine;
  receivedFileViewer.append(utcLine);

  const sensors = document.createElement("section");
  sensors.className = "received-viewer-section";
  const sensorsTitle = document.createElement("h5");
  sensorsTitle.textContent = tr("transfer.sensors");
  sensors.append(sensorsTitle);
  sensors.append(
    createViewerGrid([
      ["Temp1", formatViewerNumber(payload.sensors.temp1)],
      ["Temp2", formatViewerNumber(payload.sensors.temp2)],
      ["Hum Temp", formatViewerNumber(payload.sensors.humTemp)],
      ["Hum", formatViewerNumber(payload.sensors.hum)],
      ["Water", formatViewerNumber(payload.sensors.water)],
      ["Capacitor V", String(payload.sensors.capacitorV)],
      ["Battery V", String(payload.sensors.batV)],
      ["File Size", formatBytes(payload.file.sizeBytes)],
    ]),
  );
  receivedFileViewer.append(sensors);

  const sampling = document.createElement("section");
  sampling.className = "received-viewer-section";
  const samplingTitle = document.createElement("h5");
  samplingTitle.textContent = tr("transfer.sampling");
  sampling.append(samplingTitle);
  sampling.append(
    createViewerGrid([
      [tr("transfer.sampleSize"), String(payload.sampling.sampleSize)],
      [tr("transfer.startTimestamp"), String(payload.sampling.startTimestamp)],
      [tr("transfer.sampleSize2"), String(payload.sampling.sampleSize2)],
      [tr("transfer.trailingBytes"), String(payload.sampling.trailingBytes)],
    ]),
  );
  receivedFileViewer.append(sampling);

  if (payload.axis) {
    if (payload.track) {
      receivedFileViewer.append(renderAxisSection("Track_return_voltage", payload.track));
    }
    receivedFileViewer.append(renderAxisSection("Z", payload.axis.z));
    receivedFileViewer.append(renderAxisSection("X", payload.axis.x));
    receivedFileViewer.append(renderAxisSection("Y", payload.axis.y));
  } else {
    const axisNote = document.createElement("p");
    axisNote.className = "received-viewer-note";
    axisNote.textContent = tr("transfer.datNotFf");
    receivedFileViewer.append(axisNote);
  }
}

async function inspectReceivedDatFile(folderName, fileName) {
  if (!receivedFileViewer) {
    return;
  }

  if (!filetransferApi || typeof filetransferApi.readDat !== "function") {
    renderReceivedViewerMessage(
      "received-viewer-error",
      tr("transfer.datApiUnavailable"),
    );
    return;
  }

  const requestId = Date.now();
  receivedViewerRequestId = requestId;
  renderReceivedViewerMessage("received-viewer-note", tr("transfer.datViewerReading"));

  try {
    const result = await filetransferApi.readDat({ folderName, fileName });

    if (receivedViewerRequestId !== requestId) {
      return;
    }

    if (!result || !result.ok) {
      renderReceivedViewerMessage(
        "received-viewer-error",
        result && result.error ? result.error : tr("transfer.datParseFailed"),
      );
      return;
    }

    renderReceivedDatViewer(result.data);
  } catch (error) {
    console.error(error);
    if (receivedViewerRequestId !== requestId) {
      return;
    }
    renderReceivedViewerMessage(
      "received-viewer-error",
      tr("transfer.datParserNoResponse"),
    );
  }
}

function renderReceivedFolderModal() {
  if (
    !receivedFolderModal ||
    !receivedFolderTitle ||
    !receivedFolderSummary ||
    !receivedFolderList
  ) {
    return;
  }

  const folder = activeReceivedFolder ? findReceivedFolder(activeReceivedFolder) : null;

  if (!folder) {
    activeReceivedFileName = "";
    receivedFolderModal.hidden = true;
    receivedFolderModal.classList.remove("is-open");
    receivedFolderModal.setAttribute("aria-hidden", "true");
    renderReceivedViewerMessage("received-viewer-empty", tr("transfer.datViewerSelect"));
    return;
  }

  receivedFolderTitle.textContent = folder.dateLabel;
  receivedFolderSummary.textContent =
    `${tr("transfer.protocolFolder", { protocol: folder.protocolHint })} | ${tr("transfer.filesSummary", {
      count: folder.fileCount,
      size: formatBytes(folder.totalBytes),
    })}`;
  receivedFolderList.replaceChildren();

  if (!folder.files.length) {
    const empty = document.createElement("p");
    empty.className = "received-modal-empty";
    empty.textContent = tr("transfer.datFolderCardEmpty");
    receivedFolderList.append(empty);
    activeReceivedFileName = "";
    renderReceivedViewerMessage("received-viewer-empty", tr("transfer.datFolderEmpty"));
  } else {
    if (!folder.files.some((file) => file.name === activeReceivedFileName)) {
      activeReceivedFileName = "";
      renderReceivedViewerMessage("received-viewer-empty", tr("transfer.datViewerSelect"));
    }

    folder.files.forEach((file) => {
      const row = document.createElement("button");
      row.className = "received-file-row";
      row.type = "button";
      row.title = `Open ${file.name}`;
      if (file.name === activeReceivedFileName) {
        row.classList.add("is-active");
      }

      const name = document.createElement("span");
      name.className = "received-file-name";
      name.textContent = file.name;

      const sizeLabel = document.createElement("span");
      sizeLabel.className = "received-file-size";
      sizeLabel.textContent = formatBytes(file.size);

      row.append(name, sizeLabel);
      row.addEventListener("click", () => {
        activeReceivedFileName = file.name;
        renderReceivedFolderModal();
        void inspectReceivedDatFile(folder.folderName, file.name);
      });
      receivedFolderList.append(row);
    });
  }

  receivedFolderModal.hidden = false;
  receivedFolderModal.classList.add("is-open");
  receivedFolderModal.setAttribute("aria-hidden", "false");
}

function closeReceivedFolderModal() {
  if (!activeReceivedFolder) {
    return;
  }

  activeReceivedFolder = "";
  activeReceivedFileName = "";
  receivedViewerRequestId = 0;
  renderReceivedViewerMessage("received-viewer-empty", tr("transfer.datViewerSelect"));
  renderReceivedFolderModal();
}

function openReceivedFolderModal(folderName) {
  activeReceivedFolder = folderName;
  activeReceivedFileName = "";
  receivedViewerRequestId = 0;
  renderReceivedViewerMessage("received-viewer-empty", tr("transfer.datViewerSelect"));
  renderReceivedFolderModal();
}

async function refreshReceivedTransferBrowser() {
  if (!receivedBrowser) {
    return;
  }

  if (!filetransferApi || typeof filetransferApi.listReceived !== "function") {
    renderReceivedBrowserMessage(
      "received-error",
      tr("transfer.datBrowserUnavailable"),
    );
    return;
  }

  try {
    const result = await filetransferApi.listReceived();
    receivedTransferFolders = result && result.ok ? result.folders : [];

    if (activeReceivedFolder && !findReceivedFolder(activeReceivedFolder)) {
      activeReceivedFolder = "";
      activeReceivedFileName = "";
      receivedViewerRequestId = 0;
    }

    renderReceivedTransferBrowser();
    renderReceivedFolderModal();
  } catch (error) {
    console.error(error);
    closeReceivedFolderModal();
    renderReceivedBrowserMessage(
      "received-error",
      tr("transfer.datBrowserLoadFailed"),
    );
  }
}

function renderTransferLog() {
  if (!transferLog) {
    return;
  }

  const distanceFromBottom =
    transferLog.scrollHeight - transferLog.scrollTop - transferLog.clientHeight;
  const shouldStickToBottom = distanceFromBottom <= 24;

  const frames = transferLogLines.slice();

  if (transferLiveLine) {
    frames.push(transferLiveLine);
  }

  transferLog.textContent = frames.join("\n");

  if (shouldStickToBottom) {
    transferLog.scrollTop = transferLog.scrollHeight;
    return;
  }

  transferLog.scrollTop = Math.max(
    0,
    transferLog.scrollHeight - transferLog.clientHeight - distanceFromBottom,
  );
}

function updateText(node, text) {
  if (node) {
    node.textContent = text;
  }
}

function updateProgress(percent) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));

  if (transferProgressBar) {
    transferProgressBar.style.width = `${clamped}%`;
  }

  if (transferProgressText) {
    transferProgressText.textContent = `${clamped.toFixed(2)}%`;
  }
}

function resetTransferDashboard(modeKey) {
  transferStreamBuffer = "";
  transferLogLines = [];
  transferLiveLine = "";
  transferRuntime = {
    filesCount: 0,
    completedFiles: 0,
    retries: 0,
  };

  renderTransferMode(modeKey);
  updateText(statCurrentFile, tr("transfer.currentFileWaiting"));
  updateText(statFileSize, "0 B");
  updateText(statWriteSpeed, "0 B/s");
  updateText(statRemaining, "0 B");
  updateText(summaryTotalBytes, "0 B");
  updateText(summaryTotalDuration, "0.0 s");
  updateText(summaryAverageRate, "0 B/s");
  updateText(summaryExtra, "0 / 0");
  updateProgress(0);
  setTransferHelpNote("");
  setTransferLogCollapsed(true);
}

function applyTransferConsoleText(text) {
  if (!transferLog || !text) {
    return;
  }

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === "\r") {
      if (text[index + 1] === "\n") {
        transferLogLines.push(transferLiveLine);
        transferLiveLine = "";
        index += 1;
      } else {
        transferLiveLine = "";
      }
      continue;
    }

    if (character === "\n") {
      transferLogLines.push(transferLiveLine);
      transferLiveLine = "";
      continue;
    }

    transferLiveLine += character;
  }

  renderTransferLog();
}

function tryHandleStructuredTransferEvent(rawLine) {
  const payloadText = rawLine.trim();

  if (!payloadText) {
    return true;
  }

  try {
    handleStructuredTransferEvent(JSON.parse(payloadText));
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function handleStructuredTransferEvent(eventPayload) {
  if (!eventPayload || typeof eventPayload !== "object") {
    return;
  }

  if (eventPayload.type === "session") {
    if (eventPayload.endpoint) {
      updateText(protocolEndpoint, eventPayload.endpoint);
    }
    return;
  }

  if (eventPayload.type === "files_count") {
    transferRuntime.filesCount = Number(eventPayload.count) || 0;
    updateText(summaryExtra, `${transferRuntime.filesCount} / ${transferRuntime.retries}`);
    return;
  }

  if (eventPayload.type === "file_start") {
    updateText(statCurrentFile, eventPayload.name || tr("transfer.currentFileUnknown"));
    updateText(statFileSize, formatBytes(eventPayload.size));
    updateText(statWriteSpeed, "0 B/s");
    updateText(statRemaining, formatBytes(eventPayload.remaining));
    updateProgress(eventPayload.percent);
    return;
  }

  if (eventPayload.type === "file_progress") {
    updateText(statCurrentFile, eventPayload.name || tr("transfer.currentFileUnknown"));
    updateText(statFileSize, formatBytes(eventPayload.size));
    updateText(statWriteSpeed, formatSpeed(eventPayload.bps));
    updateText(statRemaining, formatBytes(eventPayload.remaining));
    updateProgress(eventPayload.percent);
    return;
  }

  if (eventPayload.type === "file_done") {
    transferRuntime.completedFiles += 1;
    updateText(statCurrentFile, eventPayload.name || tr("transfer.currentFileDone"));
    updateText(statFileSize, formatBytes(eventPayload.size));
    updateText(statWriteSpeed, formatSpeed(eventPayload.bps));
    updateText(statRemaining, "0 B");
    updateProgress(100);
    updateText(summaryExtra, `${transferRuntime.completedFiles} / ${transferRuntime.retries}`);
    return;
  }

  if (eventPayload.type === "summary") {
    if (typeof eventPayload.total_retries === "number") {
      transferRuntime.retries = eventPayload.total_retries;
    }
    if (typeof eventPayload.total_files === "number") {
      transferRuntime.completedFiles = eventPayload.total_files;
    }

    updateText(summaryTotalBytes, formatBytes(eventPayload.total_bytes));
    updateText(summaryTotalDuration, formatDuration(eventPayload.elapsed));
    updateText(
      summaryAverageRate,
      eventPayload.average_rate || formatSpeed(eventPayload.average_bps),
    );
    updateText(summaryExtra, `${transferRuntime.completedFiles} / ${transferRuntime.retries}`);
  }
}

function consumeTransferChunk(chunk) {
  if (!chunk) {
    return;
  }

  transferStreamBuffer += String(chunk);

  while (transferStreamBuffer) {
    const eventIndex = transferStreamBuffer.indexOf(TRANSFER_EVENT_PREFIX);

    if (eventIndex === -1) {
      applyTransferConsoleText(transferStreamBuffer);
      transferStreamBuffer = "";
      return;
    }

    if (eventIndex > 0) {
      applyTransferConsoleText(transferStreamBuffer.slice(0, eventIndex));
      transferStreamBuffer = transferStreamBuffer.slice(eventIndex);
    }

    const lineBreakMatch = transferStreamBuffer.match(/\r\n|\r|\n/);
    if (!lineBreakMatch || typeof lineBreakMatch.index !== "number") {
      return;
    }

    const lineBreakIndex = lineBreakMatch.index;
    const payloadText = transferStreamBuffer
      .slice(TRANSFER_EVENT_PREFIX.length, lineBreakIndex);

    if (!tryHandleStructuredTransferEvent(payloadText)) {
      applyTransferConsoleText(
        `${TRANSFER_EVENT_PREFIX}${payloadText}${lineBreakMatch[0]}`,
      );
    }

    transferStreamBuffer = transferStreamBuffer.slice(
      lineBreakIndex + lineBreakMatch[0].length,
    );
  }
}

async function startTransfer(modeKey) {
  if (!transferDateInput || !transferButton || !udpTransferButton || !transferActionStatus || !transferLog) {
    return;
  }

  const modeConfig = TRANSFER_MODES[modeKey];
  const mode = getModeText(modeKey);
  if (!modeConfig || !mode) {
    return;
  }

  const selectedDate = normalizeTransferDateInput(transferDateInput.value);

  if (!selectedDate) {
    transferActionStatus.textContent = tr("transfer.chooseDateFirst");
    return;
  }

  if (!filetransferApi) {
    transferActionStatus.textContent = tr("transfer.apiUnavailable");
    setTransferHelpNote("");
    setTransferLogCollapsed(false);
    transferLog.textContent = tr("transfer.rendererApiError");
    return;
  }

  currentTransferMode = modeKey;
  resetTransferDashboard(modeKey);
  transferButton.disabled = true;
  udpTransferButton.disabled = true;
  transferActionStatus.textContent = mode.runningText;
  setTransferHelpNote("");
  setTransferLogCollapsed(true);
  transferStreamBuffer = "";
  transferLogLines = [];
  transferLiveLine = "";
  appendTransferLog(`${mode.launchLabel}\n${tr("transfer.selectedDate", { date: selectedDate })}\n`);

  try {
    const activeWifiName = getPersistedWifiName() || DEFAULT_TRANSFER_WIFI_NAME;
    const transferRequest = {
      dateText: selectedDate,
      wifiName: activeWifiName,
    };
    const result =
      modeKey === "udp"
        ? await filetransferApi.startUdp(transferRequest)
        : await filetransferApi.start(transferRequest);

    if (!result.ok) {
      const errorText = result.error || mode.failText;
      const isTransferFailure = !result.error;

      transferActionStatus.textContent = errorText;
      setTransferHelpNote(isTransferFailure ? tr("transfer.failureNote") : "");
      setTransferLogCollapsed(!isTransferFailure);
      appendTransferLog(`\n${errorText || tr("transfer.launchFailedFallback")}\n`);
      transferButton.disabled = false;
      udpTransferButton.disabled = false;
    }
  } catch (error) {
    transferActionStatus.textContent = tr("transfer.launchFailed");
    setTransferHelpNote("");
    setTransferLogCollapsed(false);
    transferStreamBuffer = "";
    transferLogLines = [];
    transferLiveLine = "";
    appendTransferLog(error && error.message ? error.message : String(error));
    transferButton.disabled = false;
    udpTransferButton.disabled = false;
    console.error(error);
  }
}

function bindTransferLauncher() {
  if (!transferDateInput || !transferButton || !udpTransferButton || !transferActionStatus || !transferLog) {
    return;
  }

  if (!transferDateInput.value) {
    transferDateInput.value = getDefaultTransferDate();
  }

  if (filetransferApi && typeof filetransferApi.onEvent === "function") {
    filetransferApi.onEvent((payload) => {
      const modeKey = payload.mode || currentTransferMode;
      const mode = getModeText(modeKey);

      if (payload.type === "started") {
        if (payload.mode) {
          renderTransferMode(payload.mode);
        }
        appendTransferLog(`> ${payload.command}\n`);
        transferActionStatus.textContent = mode.runningText;
        setTransferHelpNote("");
        setTransferLogCollapsed(true);
        return;
      }

      if (payload.type === "stdout" || payload.type === "stderr") {
        consumeTransferChunk(payload.chunk);
        return;
      }

      if (payload.type === "error") {
        appendTransferLog(`\n${payload.message}\n`);
        transferActionStatus.textContent = mode.failText;
        setTransferHelpNote(tr("transfer.failureNote"));
        setTransferLogCollapsed(false);
        void refreshReceivedTransferBrowser();
        transferButton.disabled = false;
        udpTransferButton.disabled = false;
        return;
      }

      if (payload.type === "exit") {
        if (transferStreamBuffer || transferLiveLine) {
          consumeTransferChunk("\n");
        }
        appendTransferLog(
          `\n${tr("transfer.processExited", {
            code: payload.code,
            signal: payload.signal ? ` (${payload.signal})` : "",
          })}\n`,
        );
        transferActionStatus.textContent = payload.ok ? mode.successText : mode.failText;
        setTransferHelpNote(payload.ok ? "" : tr("transfer.failureNote"));
        setTransferLogCollapsed(payload.ok);
        void refreshReceivedTransferBrowser();
        transferButton.disabled = false;
        udpTransferButton.disabled = false;
      }
    });
  } else {
    transferActionStatus.textContent =
      tr("transfer.noRealtimeEvents");
  }

  renderTransferMode(currentTransferMode);
  setTransferDetailsExpanded(false);
  void refreshReceivedTransferBrowser();

  transferButton.addEventListener("click", async () => {
    await startTransfer("tcp");
  });

  udpTransferButton.addEventListener("click", async () => {
    await startTransfer("udp");
  });

  if (transferDetailsToggle) {
    transferDetailsToggle.addEventListener("click", () => {
      const isExpanded = transferDetailsToggle.getAttribute("aria-expanded") === "true";
      setTransferDetailsExpanded(!isExpanded);
    });
  }

  if (receivedFolderBackdrop) {
    receivedFolderBackdrop.addEventListener("click", () => {
      closeReceivedFolderModal();
    });
  }

  if (receivedFolderClose) {
    receivedFolderClose.addEventListener("click", () => {
      closeReceivedFolderModal();
    });
  }

  if (receivedFolderModal) {
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !receivedFolderModal.hidden) {
        closeReceivedFolderModal();
      }
    });
  }
}

applyI18nToDom();
bindLanguageToggle();
renderActiveNavigation();
bindHomeWebview();
bindReadyCheckWifi();
bindTransferLauncher();
