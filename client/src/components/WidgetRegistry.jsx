import { SimpleBarChart, SimplePieChart, SimpleRadarChart, AdvancedComposedChart } from './ChartLibrary';

const COMPONENT_MAP = {
    'bar_chart': SimpleBarChart,
    'pie_chart': SimplePieChart,
    'donut_chart': (props) => <SimplePieChart {...props} config={{ ...props.config, innerRadius: 60 }} />,
    'radar_chart': SimpleRadarChart,
    'composed_chart': AdvancedComposedChart
    // Add other mappings here...
};

export const WidgetRenderer = ({ type, config, data }) => {
    const Widget = COMPONENT_MAP[type];
    if (!Widget) return <div className="error">Unknown Widget: {type}</div>;
    return <Widget config={config} data={data} />;
};
