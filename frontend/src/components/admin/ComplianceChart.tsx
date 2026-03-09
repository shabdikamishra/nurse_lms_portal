import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const complianceData = [
  { department: 'ICU', compliance: 98 },
  { department: 'Emergency', compliance: 94 },
  { department: 'Surgery', compliance: 96 },
  { department: 'Pediatrics', compliance: 92 },
  { department: 'Oncology', compliance: 97 },
  { department: 'Cardiology', compliance: 89 },
  { department: 'Neurology', compliance: 95 },
];

const getBarColor = (value: number) => {
  if (value >= 95) return 'hsl(142, 72%, 42%)'; // success
  if (value >= 90) return 'hsl(38, 92%, 50%)'; // warning
  return 'hsl(0, 72%, 51%)'; // destructive
};

export function ComplianceChart() {
  return (
    <div className="healthcare-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">Department Compliance Rate</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={complianceData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
            <XAxis 
              type="number" 
              domain={[0, 100]} 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis 
              type="category" 
              dataKey="department" 
              width={80}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number) => [`${value}%`, 'Compliance Rate']}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-md)'
              }}
            />
            <Bar dataKey="compliance" radius={[0, 4, 4, 0]}>
              {complianceData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.compliance)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span className="text-sm text-muted-foreground">≥95% Compliant</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-warning" />
          <span className="text-sm text-muted-foreground">90-94% At Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span className="text-sm text-muted-foreground">&lt;90% Non-Compliant</span>
        </div>
      </div>
    </div>
  );
}
