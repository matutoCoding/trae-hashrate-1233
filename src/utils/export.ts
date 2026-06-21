import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import type { AuditReport, ReportDimension, DrillState, Rectification, Folder, Member } from '@/types';
import { folders } from '@/data/folders';

const statusLabels: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成',
  cancelled: '已取消',
};

function getTimestamp() {
  const d = new Date();
  return `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}${d.getHours().toString().padStart(2, '0')}${d.getMinutes().toString().padStart(2, '0')}`;
}

function getScopeLabel(drill: DrillState) {
  if (drill.level === 'overview') return '全公司';
  if (drill.level === 'department') return `部门：${drill.department}`;
  if (drill.level === 'project') return `项目：${drill.project}`;
  if (drill.level === 'folder') return `文件夹：${drill.folderName}`;
  if (drill.level === 'rectifications') return `整改单：${drill.folderName}`;
  return '全公司';
}

export async function exportExcel(
  report: AuditReport,
  dimension: ReportDimension,
  drill: DrillState = { level: 'overview' },
  rectifications: Rectification[] = []
) {
  const scope = getScopeLabel(drill);
  const wb = XLSX.utils.book_new();

  // Sheet1: 概览
  const overviewData = [
    ['云盘权限审计报告'],
    ['导出时间', new Date().toLocaleString('zh-CN')],
    ['统计周期', report.period],
    ['统计范围', scope],
    [],
    ['指标', '数量'],
    ['问题总数', report.totalIssues],
    ['已处理', report.resolved],
    ['处理中', report.processing || 0],
    ['待处理', report.pending],
    ['逾期未处理', report.overdue || 0],
    ['整改完成率', `${report.completionRate}%`],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(overviewData);
  ws1['!cols'] = [{ wch: 20 }, { wch: 40 }];
  ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  XLSX.utils.book_append_sheet(wb, ws1, '概览');

  // Sheet2: 明细 - 停在哪一级就用哪一级的下一级明细
  let detailTitle = '部门明细';
  const headers: string[] = [];
  const detailData: any[][] = [];

  if (drill.level === 'overview') {
    // 概览页：部门明细
    detailTitle = '部门明细';
    headers.push('部门名称', '问题总数', '已处理', '处理中', '待处理', '逾期', '完成率');
    detailData.push(headers);
    const stats = report.departmentStats || [];
    stats.forEach((s: any) => {
      const rate = s.totalIssues > 0 ? Math.round((s.resolved / s.totalIssues) * 100) : 0;
      detailData.push([s.name, s.totalIssues, s.resolved, s.processing || 0, s.pending, s.overdue || 0, `${rate}%`]);
    });
  } else if (drill.level === 'department') {
    // 部门页：项目明细
    detailTitle = `${drill.department} - 项目明细`;
    headers.push('项目名称', '所属部门', '问题总数', '已处理', '处理中', '待处理', '逾期', '完成率');
    detailData.push(headers);
    const stats = (report.projectStats || []).filter((s: any) => s.department === drill.department);
    stats.forEach((s: any) => {
      const rate = s.totalIssues > 0 ? Math.round((s.resolved / s.totalIssues) * 100) : 0;
      detailData.push([s.name, s.department, s.totalIssues, s.resolved, s.processing || 0, s.pending, s.overdue || 0, `${rate}%`]);
    });
  } else if (drill.level === 'project') {
    // 项目页：文件夹明细
    detailTitle = `${drill.project} - 文件夹明细`;
    headers.push('文件夹名称', '所属部门', '所属项目', '问题总数', '已处理', '处理中', '待处理', '逾期', '完成率');
    detailData.push(headers);
    const stats = (report.folderStats || []).filter((s: any) => s.department === drill.department && s.project === drill.project);
    stats.forEach((s: any) => {
      const rate = s.totalIssues > 0 ? Math.round((s.resolved / s.totalIssues) * 100) : 0;
      detailData.push([s.name, s.department, s.project, s.totalIssues, s.resolved, s.processing || 0, s.pending, s.overdue || 0, `${rate}%`]);
    });
  } else {
    // 文件夹页 / 整改单页：只看当前文件夹
    detailTitle = drill.folderName || '文件夹详情';
    headers.push('文件夹名称', '所属部门', '所属项目', '问题总数', '已处理', '处理中', '待处理', '逾期', '完成率');
    detailData.push(headers);
    const stats = (report.folderStats || []).filter((s: any) => s.folderId === drill.folderId);
    stats.forEach((s: any) => {
      const rate = s.totalIssues > 0 ? Math.round((s.resolved / s.totalIssues) * 100) : 0;
      detailData.push([s.name, s.department, s.project, s.totalIssues, s.resolved, s.processing || 0, s.pending, s.overdue || 0, `${rate}%`]);
    });
  }

  const ws2 = XLSX.utils.aoa_to_sheet(detailData);
  ws2['!cols'] = headers.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, ws2, '明细');

  // Sheet3: 整改任务明细
  const rectHeaders = [
    '文件夹名称',
    '所属部门',
    '所属项目',
    '状态',
    '是否逾期',
    '审计员',
    '负责人',
    '涉及成员',
    '整改要求',
    '处理结果',
    '发起时间',
    '到期日期',
    '完成时间',
    '整改单号',
  ];

  const sourceRects = rectifications.length > 0
    ? rectifications
    : (() => {
        // 从 store 拿可能拿不到，这里尝试从全局获取或留空
        try {
          const storeModule = require('@/store/useRectificationStore');
          const all = storeModule.useRectificationStore?.getState?.().rectifications || [];
          if (drill.level === 'department' && drill.department) {
            const folderIds = folders.filter((f) => f.department === drill.department).map((f) => f.id);
            return all.filter((r: Rectification) => folderIds.includes(r.folderId));
          }
          if (drill.level === 'project' && drill.department && drill.project) {
            const folderIds = folders
              .filter((f) => f.department === drill.department && f.project === drill.project)
              .map((f) => f.id);
            return all.filter((r: Rectification) => folderIds.includes(r.folderId));
          }
          if ((drill.level === 'folder' || drill.level === 'rectifications') && drill.folderId) {
            return all.filter((r: Rectification) => r.folderId === drill.folderId);
          }
          return all;
        } catch {
          return [];
        }
      })();

  const rectData: any[][] = [rectHeaders];

  sourceRects.forEach((r: Rectification) => {
    const folder = folders.find((f) => f.id === r.folderId);
    rectData.push([
      r.folderName,
      folder?.department || '-',
      folder?.project || '-',
      statusLabels[r.status] || r.status,
      r.isOverdue ? '是' : '否',
      r.auditorName,
      r.ownerName,
      r.memberNames.join('、'),
      r.opinion,
      r.result || '-',
      r.createdAt,
      r.dueDate || '-',
      r.completedAt || '-',
      r.id,
    ]);
  });

  const ws3 = XLSX.utils.aoa_to_sheet(rectData);
  ws3['!cols'] = rectHeaders.map((_, i) => ({
    wch: i === 0 || i === 7 || i === 8 || i === 9 ? 30 : 15,
  }));
  XLSX.utils.book_append_sheet(wb, ws3, '整改任务明细');

  const fileName = `云盘权限审计报告_${report.period}_${getTimestamp()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export async function exportPDF(
  report: AuditReport,
  dimension: ReportDimension,
  drill: DrillState = { level: 'overview' },
  rectifications: Rectification[] = []
) {
  const scope = getScopeLabel(drill);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // 标题
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('云盘权限审计报告', pageWidth / 2, y, { align: 'center' });
  y += 30;

  // 副标题
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`统计周期：${report.period}  |  统计范围：${scope}`, pageWidth / 2, y, { align: 'center' });
  y += 10;
  doc.text(`导出时间：${new Date().toLocaleString('zh-CN')}`, pageWidth / 2, y, { align: 'center' });
  y += 30;

  // 核心指标卡片
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('核心指标', margin, y);
  y += 20;

  const cardWidth = (contentWidth - 30) / 4;
  const cardHeight = 80;
  const metrics = [
    { label: '问题总数', value: report.totalIssues.toString(), color: [59, 130, 246] },
    { label: '已处理', value: report.resolved.toString(), color: [16, 185, 129] },
    { label: '待处理', value: report.pending.toString(), color: [245, 158, 11] },
    { label: '逾期', value: (report.overdue || 0).toString(), color: [239, 68, 68] },
  ];

  metrics.forEach((m, i) => {
    const x = margin + i * (cardWidth + 10);
    doc.setFillColor(m.color[0], m.color[1], m.color[2]);
    doc.roundedRect(x, y, cardWidth, cardHeight, 6, 6, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(m.label, x + 15, y + 25);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(m.value, x + 15, y + 55);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const rateText = i === 3
      ? `${report.overdue || 0 > 0 ? '需重点催办' : '暂无逾期'}`
      : `占比 ${report.totalIssues > 0 ? Math.round((parseInt(m.value) / report.totalIssues) * 100) : 0}%`;
    doc.text(rateText, x + 15, y + 70);
  });

  y += cardHeight + 30;

  // 完成率
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('整改完成率', margin, y);
  y += 20;

  const rate = report.completionRate;
  const barX = margin;
  const barY = y;
  const barW = contentWidth;
  const barH = 20;

  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(barX, barY, barW, barH, 4, 4, 'FD');

  const fillW = (rate / 100) * barW;
  doc.setFillColor(rate >= 80 ? 16 : rate >= 50 ? 245 : 239, rate >= 80 ? 185 : rate >= 50 ? 158 : 68, rate >= 80 ? 129 : rate >= 50 ? 11 : 68);
  doc.roundedRect(barX, barY, fillW, barH, 4, 4, 'F');

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${rate}%`, barX + 10, barY + 14);

  y += barH + 30;

  // 遗留清单（pending + processing + overdue）
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const pendingRects = rectifications.filter(
    (r) => r.status === 'pending' || r.status === 'processing'
  ).sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return 0;
  });

  const sourceForPending = pendingRects.length > 0
    ? pendingRects
    : (() => {
        try {
          const storeModule = require('@/store/useRectificationStore');
          const all = storeModule.useRectificationStore?.getState?.().rectifications || [];
          return all
            .filter((r: Rectification) => r.status === 'pending' || r.status === 'processing')
            .sort((a: Rectification, b: Rectification) => {
              if (a.isOverdue && !b.isOverdue) return -1;
              if (!a.isOverdue && b.isOverdue) return 1;
              return 0;
            });
        } catch {
          return [];
        }
      })();

  const displayList = sourceForPending.slice(0, 6);

  doc.text(`遗留待处理清单（显示前 ${displayList.length} 条）`, margin, y);
  y += 18;

  if (displayList.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('当前统计范围下暂无遗留待处理任务。', margin, y);
  } else {
    // 表头
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F');

    const col1X = margin + 10;
    const col2X = margin + 220;
    const col3X = margin + 320;
    const col4X = margin + 400;

    doc.text('文件夹', col1X, y + 13);
    doc.text('负责人', col2X, y + 13);
    doc.text('状态', col3X, y + 13);
    doc.text('到期日', col4X, y + 13);

    y += 20;

    displayList.forEach((r: Rectification, idx: number) => {
      if (y > 750) {
        doc.addPage();
        y = margin;
      }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(r.isOverdue ? 239 : 0, r.isOverdue ? 68 : 0, r.isOverdue ? 68 : 0);

      const rowY = y + idx * 28;

      // 文件夹
      doc.text(r.folderName.length > 18 ? r.folderName.substring(0, 18) + '...' : r.folderName, col1X, rowY + 13);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        r.opinion.length > 28 ? r.opinion.substring(0, 28) + '...' : r.opinion,
        col1X,
        rowY + 24
      );

      // 负责人
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(r.ownerName, col2X, rowY + 13);

      // 状态
      doc.setTextColor(
        r.status === 'processing' ? 59 : r.isOverdue ? 239 : 245,
        r.status === 'processing' ? 130 : r.isOverdue ? 68 : 158,
        r.status === 'processing' ? 246 : r.isOverdue ? 68 : 11
      );
      doc.text(
        statusLabels[r.status] + (r.isOverdue ? '(逾期)' : ''),
        col3X,
        rowY + 13
      );

      // 到期日
      doc.setTextColor(100, 100, 100);
      doc.text(r.dueDate || '-', col4X, rowY + 13);

      // 分隔线
      if (idx < displayList.length - 1) {
        doc.setDrawColor(235, 235, 235);
        doc.line(margin, rowY + 28, margin + contentWidth, rowY + 28);
      }
    });
  }

  const fileName = `云盘权限审计报告_${report.period}_${getTimestamp()}.pdf`;
  doc.save(fileName);
}

export function exportRiskListExcel(
  foldersData: Folder[],
  filename?: string
) {
  const wb = XLSX.utils.book_new();

  const data = [
    ['文件夹名称', '路径', '部门', '项目', '风险等级', '风险类型', '成员数', '负责人', '最近访问', '创建时间'],
    ...foldersData.map((f) => [
      f.name,
      f.path,
      f.department,
      f.project,
      f.riskLevel === 'high' ? '高' : f.riskLevel === 'medium' ? '中' : '低',
      f.riskTypes.join('、'),
      f.memberCount,
      f.ownerName,
      f.lastAccessed,
      f.createdAt,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 25 },
    { wch: 35 },
    { wch: 12 },
    { wch: 18 },
    { wch: 10 },
    { wch: 30 },
    { wch: 8 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, '风险清单');

  const fileName = filename || `风险清单_${getTimestamp()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportMembersExcel(
  folderName: string,
  members: Member[],
  filename?: string
) {
  const wb = XLSX.utils.book_new();
  const data = [
    ['姓名', '部门', '角色', '授权来源', '最近访问', '是否外部', '是否离职', '状态'],
    ...members.map((m) => [
      m.name,
      m.department,
      m.role === 'owner' ? '所有者' : m.role === 'editor' ? '编辑者' : m.role === 'commenter' ? '评论者' : '查看者',
      m.accessSource,
      m.lastAccess,
      m.isExternal ? '是' : '否',
      m.isResigned ? '是' : '否',
      m.status === 'active' ? '正常' : '异常',
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 15 },
    { wch: 20 },
    { wch: 10 },
    { wch: 25 },
    { wch: 20 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, `${folderName}成员列表`);

  const fileName = filename || `${folderName}_成员列表_${getTimestamp()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
