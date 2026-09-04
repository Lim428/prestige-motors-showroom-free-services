import type { AppMessages } from "@/i18n/messages/en";

const messages: AppMessages = {
  Metadata: {
    title: "Prestige Motors | 高端二手车经销商",
    titleTemplate: "{title} | Prestige Motors",
    description: "浏览经过检验的二手车，查看优质照片、详细规格，并直接联系车商。",
    openGraphDescription: "高端二手车展厅，车辆经过检验，规格与资料清晰透明。"
  },
  PageMetadata: {
    home: {
      title: "高端二手车展厅",
      description:
        "按品牌、车身类型、价格、年份、里程、燃料类型和变速箱搜索马来西亚二手车。"
    },
    tradeIn: {
      title: "旧车置换",
      description:
        "提交您的车辆资料和照片，向 Prestige Motors 申请直接置换估价。"
    },
    testDrive: {
      title: "预约试驾",
      description: "通过展厅实时预约时段申请 Prestige Motors 私人试驾。"
    },
    compare: {
      title: "车辆比较",
      description:
        "按价格、里程、规格和配备并排比较已收藏的 Prestige Motors 车辆。"
    },
    alertConfirm: {
      title: "确认车辆提醒",
      description: "确认您的电子邮箱并启用 Prestige Motors 车辆提醒。"
    },
    alertUnsubscribe: {
      title: "管理车辆提醒",
      description: "停止订阅 Prestige Motors 车辆提醒。"
    },
    adminDashboard: { title: "管理控制台" },
    adminLogin: { title: "管理员登录" },
    vehicle: {
      notFound: "未找到车辆",
      description:
        "查看 {vehicle} 的核实资料、照片、规格，并直接联系车商。"
    }
  },
  LanguageSwitcher: {
    label: "切换语言",
    changing: "正在切换语言"
  },
  Global: {
    skipToMain: "跳到主要内容",
    skipToAdmin: "跳到管理内容",
    loading: "加载中",
    retry: "重试",
    close: "关闭",
    cancel: "取消",
    save: "保存",
    saving: "保存中",
    delete: "删除",
    edit: "编辑",
    view: "查看",
    search: "搜索",
    clear: "清除",
    all: "全部",
    optional: "选填"
  }
};

export default messages;
