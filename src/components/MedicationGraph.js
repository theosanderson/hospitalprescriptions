// components/MedicationGraph.js
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ClipLoader } from 'react-spinners';

const titleCase = (str) => {
  return str.toLowerCase().split(' ').map(function(word) {
    return word.replace(word[0], word[0].toUpperCase());
  }).join(' ');
};

const colors = [
  '#8884d8', // Lavender
  '#82ca9d', // Mint
  '#ffc658', // Light Orange
  '#a4de6c', // Lime Green
  '#d0ed57', // Yellow
  '#83a6ed', // Sky Blue
  '#8dd1e1', // Cyan
  '#ff7300', // Orange
  '#d83b80', // Magenta
  '#c44ec8', // Purple
  '#fa8e57', // Coral
  '#4d8fac', // Cerulean
  '#b10058', // Ruby
  '#f781bf', // Pink
  '#bebada', // Periwinkle
  '#fdb462', // Tangerine
  '#b3de69', // Pear
  '#fccde5', // Baby Pink
  '#d9d9d9', // Grey
  '#bc80bd'  // Orchid
];


function formatDate(tick) {
  console.log(tick);
  const year = Math.floor(tick / 100);
  const month = tick % 100;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return `${monthNames[month - 1]} ${year}`;
}

function MedicationGraph({ medication }) {
  const [selectedMetric, setSelectedMetric] = useState('number');

  const [usageData, setUsageData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const fetchUsageData = async () => {
      if (medication) {
        const response = await fetch(`/api/fetchUsage?medicationCode=${medication.vmp_snomed_code}&type=${selectedMetric}`);
        let data = await response.json();
        // uncapitalise the unit
        data = data.map(item => ({ ...item, unit_name: item.unit_name.toLowerCase() }));
        setUsageData(data);
        setLoading(false);
      }
    };

    fetchUsageData();
  }, [medication, selectedMetric]);

  const uniqueUnits = [...new Set(usageData.map(item => item.unit_name))];
  const numUnits = uniqueUnits.length;

  function formatYAxis(tick) {
    return selectedMetric === 'number' ? tick.toLocaleString() : `£${tick.toLocaleString()}`;
  }


function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    const year = Math.floor(data.year_month / 100);
    const month = data.year_month % 100;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const formattedDate = `${monthNames[month - 1]} ${year}`;
    
    return (
      <div style={{ backgroundColor: 'white', border: '1px solid #ccc', padding: '10px' }}>
        <p>{formattedDate}</p>
        {payload.map(item => (
          <p key={item.name} style={{ color: item.color }}>
            {numUnits>1 && <>{item.name}: </>}
            {selectedMetric=='number' && <>{item.value.toLocaleString()} {numUnits > 1 ? 'units' : uniqueUnits[0]+'s'}</> }
            {selectedMetric=='cost' && <>&pound;{item.value.toLocaleString()}</> }
          </p>
        ))}
      </div>
    );
  }

  return null;
}


  if (!medication) return null;

  return (
    <div style={{ width: '600px' }} className='mx-auto'>
      <h2 className="text-xl font-bold mb-2">{medication.vmp_product_name}{
      loading &&
      <></>
}</h2>
      <div className="flex justify-end items-center">
  <label className="flex items-center text-sm text-gray-500 mr-4">
    <input 
      type="radio" 
      value="number" 
      className="mr-2"
      checked={selectedMetric === 'number'} 
      onChange={() => setSelectedMetric('number')} 
    />
    Number of {numUnits > 1 ? 'units' : uniqueUnits[0]+'s'}
  </label>
  <label className="flex items-center text-sm text-gray-500 mr-6">
    <input 
      type="radio" 
      value="cost" 
      className="mr-2"
      checked={selectedMetric === 'cost'} 
      onChange={() => setSelectedMetric('cost')} 
    />
    Indicative cost
  </label>
</div>

    <LineChart width={600} height={300} data={usageData} margin={{ top: 5, right: 60, left: 60, bottom: 5 }}>
     <XAxis dataKey="year_month" tickFormatter={formatDate} />
      <YAxis  tickFormatter={formatYAxis}  label={{ value: selectedMetric === 'number' ? 'Number of '+( numUnits==1 ? uniqueUnits[0]+"s": "units") : 'Indicative cost', angle: -90, position: 'outsideLeft', dx:-70 }} />
      <CartesianGrid strokeDasharray="3 3" />
      
      <Legend />
      {
  uniqueUnits.map((unit,i) => (
    <Line 
      key={unit}
      type="monotone"
      dataKey={d => 
        d.unit_name === unit ? 
          ( selectedMetric === 'number' ? d.total_usage : d.total_cost) 
          : null
      }
      stroke={colors[i]}
      activeDot={{ r: 8 }}
      name={unit} // this will be used in the legend
    />
  ))
}
<Tooltip content={<CustomTooltip />} />
    </LineChart>
    </div>
  );
}

export default MedicationGraph;