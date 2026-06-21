import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import type { AuditReport, ReportDimension } from '@/types';

const columnHeaders: Record<ReportDimension, { key: string; label: string }[]> = {
  department: [
    { key: 'name', label: '部门名称' },
    { key: 'totalIssues', label: '问题总数' },
    { key: 'resolved', label: '已处理' },
    { key: 'pending', label: '遗留项' },
    { key: 'rate', label: '完成率' },
  ],
  project: [
    { key: 'name', label: '项目名称' },
    { key: 'department', label: '所属部门' },
    { key: 'totalIssues', label: '问题总数' },
    { key: 'resolved', label: '已处理' },
    { key: 'pending', label: '遗留项' },
    { key: 'rate', label: '完成率' },
  ],
  folder: [
    { key: 'name', label: '文件夹名称' },
    { key: 'department', label: '所属部门' },
    { key: 'project', label: '所属项目' },
    { key: 'totalIssues', label: '问题总数' },
    { key: 'resolved', label: '已处理' },
    { key: 'pending', label: '遗留项' },
    { key: 'rate', label: '完成率' },
  ],
};

function getDimensionData(report: AuditReport, dimension: ReportDimension) {
  if (dimension === 'department') {
    return report.departmentStats.map((item) => ({
      name: item.name,
      totalIssues: item.totalIssues,
      resolved: item.resolved,
      pending: item.pending,
      rate: `${item.totalIssues > 0 ? Math.round((item.resolved / item.totalIssues) * 100) : 0}%`,
    }));
  }
  if (dimension === 'project') {
    return report.projectStats.map((item) => ({
      name: item.name,
      department: item.department,
      totalIssues: item.totalIssues,
      resolved: item.resolved,
      pending: item.pending,
      rate: `${item.totalIssues > 0 ? Math.round((item.resolved / item.totalIssues) * 100) : 0}%`,
    }));
  }
  return report.folderStats.map((item) => ({
    name: item.name,
    department: item.department,
    project: item.project,
    totalIssues: item.totalIssues,
    resolved: item.resolved,
    pending: item.pending,
    rate: `${item.totalIssues > 0 ? Math.round((item.resolved / item.totalIssues) * 100) : 0}%`,
  }));
}

export async function exportExcel(
  report: AuditReport,
  dimension: ReportDimension,
  department?: string
) {
  const summaryData = [
    { A: '报告周期', B: report.period },
    { A: '统计维度', B: dimension === 'department' ? '按部门' : dimension === 'project' ? '按项目' : '按文件夹' },
    { A: '', B: '' },
    { A: '核心指标概览', B: '' },
    { A: '本月问题总数', B: report.totalIssues },
    { A: '已处理数量', B: report.resolved },
    { A: '遗留项', B: report.pending },
    { A: '整改完成率', B: `${report.completionRate}%` },
  ];

  const dimData = getDimensionData(report, dimension);
  const filteredData = department && dimension !== 'folder'
    ? dimData.filter((d: any) => !department || (d as any).department === department || dimension === 'department' && (d as any).name === department)
    : dimData;

  const headers = columnHeaders[dimension];
  const detailHeader = Object.fromEntries(headers.map((h, i) => [String.fromCharCode(65 + i), h.label]));
  const detailRows = filteredData.map((row: any) => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => {
      obj[String.fromCharCode(65 + i)] = row[h.key as keyof typeof row];
    });
    return obj;
  });

  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(summaryData, { header: ['A', 'B'], skipHeader: true });
  ws1['!cols'] = [{ wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws1, '概览');

  const detailData = [detailHeader, ...detailRows];
  const ws2 = XLSX.utils.json_to_sheet(detailData, { header: headers.map((_, i) => String.fromCharCode(65 + i)), skipHeader: true });
  ws2['!cols'] = headers.map((h) => ({ wch: Math.max(h.label.length * 2, 15) }));
  XLSX.utils.book_append_sheet(wb, ws2, '明细数据');

  const fileName = `云盘权限审计报告_${report.period}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export async function exportPDF(
  report: AuditReport,
  dimension: ReportDimension,
  department?: string
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('云盘共享文件夹权限审计报告', pageWidth / 2, y, { align: 'center' });
  y += 40;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`报告周期: ${report.period}`, margin, y);
  y += 16;
  const dimText = dimension === 'department' ? '按部门' : dimension === 'project' ? '按项目' : '按文件夹';
  doc.text(`统计维度: ${dimText}${department ? ` (${department})` : ''}`, margin, y);
  y += 30;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('核心指标概览', margin, y);
  y += 25;

  const boxes = [
    { label: '本月问题总数', value: String(report.totalIssues) },
    { label: '已处理', value: String(report.resolved) },
    { label: '遗留项', value: String(report.pending) },
    { label: '整改完成率', value: `${report.completionRate}%` },
  ];
  const boxWidth = (pageWidth - margin * 2 - 20 * 3) / 4;
  boxes.forEach((box, i) => {
    const x = margin + i * (boxWidth + 20);
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(x, y, boxWidth, 70, 5, 5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(box.label, x + 15, y + 25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text(box.value, x + 15, y + 52);
  });
  y += 100;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(dimText + '明细', margin, y);
  y += 25;

  const dimData = getDimensionData(report, dimension);
  const filteredData = department && dimension !== 'folder'
    ? dimData.filter((d: any) => !department || (d as any).department === department || dimension === 'department' && (d as any).name === department)
    : dimData;

  const headers = columnHeaders[dimension];
  const colCount = headers.length;
  const colWidth = (pageWidth - margin * 2) / colCount;
  const rowHeight = 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setFillColor(59, 130, 246);
  doc.setTextColor(255, 255, 255);
  headers.forEach((h, i) => {
    doc.rect(margin + i * colWidth, y, colWidth, rowHeight, 'F');
    doc.text(h.label, margin + i * colWidth + 8, y + 15);
  });
  y += rowHeight;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  filteredData.forEach((row: any, idx: number) => {
    if (y + rowHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    const gray = idx % 2 === 0 ? 250 : 255;
    doc.setFillColor(gray, gray, gray);
    headers.forEach((h, i) => {
      doc.rect(margin + i * colWidth, y, colWidth, rowHeight, 'F');
      doc.setFontSize(9);
      const text = String(row[h.key as keyof typeof row]);
      doc.text(text, margin + i * colWidth + 8, y + 15, { maxWidth: colWidth - 16 });
    });
    y += rowHeight;
  });

  y += 20;
  if (y > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
  doc.text(`云盘权限审计系统 | 第 ${doc.getNumberOfPages()} 页`, margin, pageHeight - 20);

  const fileName = `云盘权限审计报告_${report.period}_${Date.now()}.pdf`;
  doc.save(fileName);
}

export function exportRiskListExcel(folders: any[], filename?: string) {
  const data = folders.map((f) => ({
    文件夹名称: f.name,
    路径: f.path,
    所属部门: f.department,
    所属项目: f.project,
    负责人: f.ownerName,
    风险类型: f.riskTypes.join(', '),
    风险等级: f.riskLevel === 'high' ? '高' : f.riskLevel === 'medium' ? '中' : '低',
    成员数: f.memberCount,
    最近访问: f.lastAccessed,
    创建时间: f.createdAt,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '风险清单');

  const f = filename || `风险清单_${new Date().toLocaleDateString('zh-CN')}.xlsx`;
  XLSX.writeFile(wb, f);
}

export function exportMembersExcel(folderName: string, members: any[], filename?: string) {
  const data = members.map((m) => ({
    姓名: m.name,
    部门: m.department,
    角色: m.role === 'owner' ? '所有者' : m.role === 'editor' ? '可编辑' : m.role === 'viewer' ? '仅查看' : '可评论',
    授权来源: m.accessSource,
    最近访问: m.lastAccess,
    是否外部: m.isExternal ? '是' : '否',
    是否离职: m.isResigned ? '是' : '否',
    状态: m.status === 'active' ? '正常' : '异常',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${folderName}_成员列表`);

  const f = filename || `${folderName}_成员列表_${new Date().toLocaleDateString('zh-CN')}.xlsx`;
  XLSX.writeFile(wb, f);
}
