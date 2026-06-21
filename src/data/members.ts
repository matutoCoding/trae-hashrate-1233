import type { Member } from '@/types';

export const membersByFolder: Record<string, Member[]> = {
  f001: [
    { id: 'm001', name: '张明华', department: '技术部', role: 'owner', accessSource: '直接授权', lastAccess: '2025-06-20 14:30', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm002', name: '李婷', department: '技术部', role: 'editor', accessSource: '直接授权', lastAccess: '2025-06-20 10:15', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm003', name: '王浩', department: '技术部', role: 'editor', accessSource: '用户组:产品组', lastAccess: '2025-06-19 16:45', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm004', name: '陈静', department: '设计部', role: 'editor', accessSource: '直接授权', lastAccess: '2025-06-18 09:20', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm005', name: '刘洋', department: '技术部', role: 'viewer', accessSource: '用户组:产品组', lastAccess: '2025-06-15 11:30', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm006', name: 'external_designer1', department: '外部合作', role: 'editor', accessSource: '外链分享', lastAccess: '2025-06-20 08:00', isExternal: true, isResigned: false, status: 'active' },
    { id: 'm007', name: 'external_agency', department: '外部合作', role: 'viewer', accessSource: '外链分享', lastAccess: '2025-06-10 15:00', isExternal: true, isResigned: false, status: 'active' },
    { id: 'm008', name: '赵磊', department: '技术部', role: 'editor', accessSource: '用户组:产品组', lastAccess: '2024-12-01 10:00', isExternal: false, isResigned: true, status: 'inactive' },
    { id: 'm009', name: '孙芳', department: '产品部', role: 'commenter', accessSource: '直接授权', lastAccess: '2025-06-01 14:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm010', name: '周杰', department: '测试部', role: 'viewer', accessSource: '用户组:测试组', lastAccess: '2025-06-20 13:00', isExternal: false, isResigned: false, status: 'active' },
  ],
  f002: [
    { id: 'm101', name: '李雪梅', department: '行政部', role: 'owner', accessSource: '直接授权', lastAccess: '2025-06-18 16:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm102', name: '王芳', department: '行政部', role: 'editor', accessSource: '直接授权', lastAccess: '2025-06-17 11:30', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm103', name: '刘强', department: '行政部', role: 'viewer', accessSource: '直接授权', lastAccess: '2025-06-10 09:00', isExternal: false, isResigned: true, status: 'inactive' },
    { id: 'm104', name: '陈丽', department: '财务部', role: 'viewer', accessSource: '直接授权', lastAccess: '2025-06-15 14:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm105', name: '张伟', department: '行政部', role: 'editor', accessSource: '用户组:HR组', lastAccess: '2024-11-20 10:00', isExternal: false, isResigned: true, status: 'inactive' },
  ],
  f003: [
    { id: 'm201', name: '王建国', department: '财务部', role: 'owner', accessSource: '直接授权', lastAccess: '2025-03-15 17:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm202', name: '李娜', department: '财务部', role: 'editor', accessSource: '用户组:财务组', lastAccess: '2025-03-10 15:30', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm203', name: '赵明', department: '财务部', role: 'viewer', accessSource: '直接授权', lastAccess: '2025-02-28 11:00', isExternal: false, isResigned: true, status: 'inactive' },
    { id: 'm204', name: '陈会计', department: '财务部', role: 'editor', accessSource: '用户组:财务组', lastAccess: '2025-03-15 16:00', isExternal: false, isResigned: false, status: 'active' },
  ],
  f004: [
    { id: 'm301', name: '赵晓琳', department: '市场部', role: 'owner', accessSource: '直接授权', lastAccess: '2025-06-21 09:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm302', name: '孙伟', department: '市场部', role: 'editor', accessSource: '用户组:市场组', lastAccess: '2025-06-20 18:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm303', name: '周莉', department: '市场部', role: 'editor', accessSource: '用户组:市场组', lastAccess: '2025-06-21 10:30', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm304', name: '吴设计', department: '设计部', role: 'editor', accessSource: '直接授权', lastAccess: '2025-06-19 14:00', isExternal: false, isResigned: false, status: 'active' },
  ],
  f005: [
    { id: 'm401', name: '陈志强', department: '法务部', role: 'owner', accessSource: '直接授权', lastAccess: '2025-01-10 15:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm402', name: '林律师', department: '法务部', role: 'editor', accessSource: '用户组:法务组', lastAccess: '2024-12-15 11:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm403', name: '王助理', department: '法务部', role: 'viewer', accessSource: '直接授权', lastAccess: '2024-11-20 09:00', isExternal: false, isResigned: false, status: 'active' },
  ],
  f006: [
    { id: 'm501', name: '刘伟强', department: '销售部', role: 'owner', accessSource: '直接授权', lastAccess: '2025-06-19 17:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm502', name: '张销售', department: '销售部', role: 'editor', accessSource: '用户组:销售组', lastAccess: '2025-06-19 16:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm503', name: '王经理', department: '销售部', role: 'editor', accessSource: '用户组:销售组', lastAccess: '2025-06-18 10:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm504', name: 'client_zhang', department: '客户方', role: 'viewer', accessSource: '外链分享', lastAccess: '2025-06-15 14:00', isExternal: true, isResigned: false, status: 'active' },
    { id: 'm505', name: '李销售', department: '销售部', role: 'editor', accessSource: '用户组:销售组', lastAccess: '2024-10-01 09:00', isExternal: false, isResigned: true, status: 'inactive' },
    { id: 'm506', name: 'partner_li', department: '合作伙伴', role: 'editor', accessSource: '外链分享', lastAccess: '2025-06-10 11:00', isExternal: true, isResigned: false, status: 'active' },
  ],
  f007: [
    { id: 'm601', name: '周鹏飞', department: '技术部', role: 'owner', accessSource: '直接授权', lastAccess: '2025-06-22 08:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm602', name: '开发甲', department: '技术部', role: 'editor', accessSource: '用户组:研发组', lastAccess: '2025-06-22 07:30', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm603', name: '开发乙', department: '技术部', role: 'editor', accessSource: '用户组:研发组', lastAccess: '2025-06-21 23:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm604', name: '陈测试', department: '测试部', role: 'viewer', accessSource: '用户组:测试组', lastAccess: '2025-06-21 20:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm605', name: '王运维', department: '运维部', role: 'editor', accessSource: '用户组:运维组', lastAccess: '2025-06-20 12:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm606', name: 'old_dev', department: '技术部', role: 'editor', accessSource: '用户组:研发组', lastAccess: '2024-08-15 10:00', isExternal: false, isResigned: true, status: 'inactive' },
  ],
  f008: [
    { id: 'm701', name: '孙丽华', department: '行政部', role: 'owner', accessSource: '直接授权', lastAccess: '2024-12-01 16:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm702', name: '培训师A', department: '行政部', role: 'editor', accessSource: '直接授权', lastAccess: '2024-11-15 14:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm703', name: '培训师B', department: '行政部', role: 'viewer', accessSource: '直接授权', lastAccess: '2024-10-20 09:00', isExternal: false, isResigned: false, status: 'active' },
  ],
  f009: [
    { id: 'm801', name: '钱伟', department: '采购部', role: 'owner', accessSource: '直接授权', lastAccess: '2025-06-17 11:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm802', name: '采购专员', department: '采购部', role: 'editor', accessSource: '用户组:采购组', lastAccess: '2025-06-16 15:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm803', name: 'supplier_a', department: '供应商', role: 'viewer', accessSource: '外链分享', lastAccess: '2025-06-15 10:00', isExternal: true, isResigned: false, status: 'active' },
    { id: 'm804', name: '财务审核', department: '财务部', role: 'viewer', accessSource: '直接授权', lastAccess: '2025-06-14 14:00', isExternal: false, isResigned: false, status: 'active' },
  ],
  f010: [
    { id: 'm901', name: '吴敏', department: '总经办', role: 'owner', accessSource: '直接授权', lastAccess: '2025-06-20 18:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm902', name: '总助王', department: '总经办', role: 'editor', accessSource: '直接授权', lastAccess: '2025-06-20 17:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm903', name: '部门经理A', department: '技术部', role: 'viewer', accessSource: '用户组:经理组', lastAccess: '2025-06-20 09:00', isExternal: false, isResigned: false, status: 'active' },
    { id: 'm904', name: '部门经理B', department: '市场部', role: 'viewer', accessSource: '用户组:经理组', lastAccess: '2025-06-19 16:00', isExternal: false, isResigned: false, status: 'active' },
  ],
};
