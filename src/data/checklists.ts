import type { ChecklistTemplate } from '../types'

/** Shareable evaluation checklist for a position-based PhD ad. */
export const checklists: ChecklistTemplate[] = [
  {
    id: 'position-fit',
    title: '岗位制快速判断',
    items: [
      {
        id: 'is-position',
        label: '是明确招聘席位（非仅表达兴趣）',
        hint: '有岗位描述、申请截止日、联系人',
      },
      {
        id: 'funding-clear',
        label: '资助/合同表述清楚',
        hint: '如 employment contract、TV-L、Marie Curie DC 等',
      },
      {
        id: 'eligibility-ok',
        label: '国籍/签证/学历门槛可满足',
      },
      {
        id: 'language-ok',
        label: '语言硬性要求可达到',
        hint: '英语/当地语证书或面试语言',
      },
      {
        id: 'topic-fit',
        label: '课题与个人方向匹配',
      },
      {
        id: 'deadline-ok',
        label: 'DDL 与材料准备时间够用',
      },
      {
        id: 'supervisor-known',
        label: '已了解导师/课题组背景',
      },
    ],
  },
]
