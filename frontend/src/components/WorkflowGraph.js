import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import * as Animatable from 'react-native-animatable';

const { width } = Dimensions.get('window');
const GRAPH_SIZE = 220;
const CENTER = GRAPH_SIZE / 2;
const RADIUS = 80;

const AGENTS = [
  { id: 'IntentParser', name: 'NLP' },
  { id: 'DisputeAgent', name: 'Safety' },
  { id: 'DiscoveryAgent', name: 'Search' },
  { id: 'RankingAgent', name: 'Rank' },
  { id: 'PricingAgent', name: 'Price' },
  { id: 'BookingAgent', name: 'Book' },
  { id: 'NotificationAgent', name: 'Alert' },
  { id: 'FollowupAgent', name: 'Track' },
];

const WorkflowGraph = ({ activeAgents = [] }) => {
  return (
    <View style={styles.container}>
      <Svg width={GRAPH_SIZE} height={GRAPH_SIZE}>
        {/* Connection Lines */}
        {AGENTS.map((agent, i) => {
          if (i === AGENTS.length - 1) return null;
          const angle1 = (i / AGENTS.length) * 2 * Math.PI - Math.PI / 2;
          const angle2 = ((i + 1) / AGENTS.length) * 2 * Math.PI - Math.PI / 2;
          
          const x1 = CENTER + RADIUS * Math.cos(angle1);
          const y1 = CENTER + RADIUS * Math.sin(angle1);
          const x2 = CENTER + RADIUS * Math.cos(angle2);
          const y2 = CENTER + RADIUS * Math.sin(angle2);

          const isActive = activeAgents.includes(agent.id) && activeAgents.includes(AGENTS[i+1].id);

          return (
            <Line
              key={`line-${i}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={isActive ? "#3B82F6" : "#E2E8F0"}
              strokeWidth={isActive ? "3" : "1"}
            />
          );
        })}

        {/* Agent Nodes */}
        {AGENTS.map((agent, i) => {
          const angle = (i / AGENTS.length) * 2 * Math.PI - Math.PI / 2;
          const x = CENTER + RADIUS * Math.cos(angle);
          const y = CENTER + RADIUS * Math.sin(angle);
          
          const isActive = activeAgents.includes(agent.id);

          return (
            <G key={agent.id}>
              <Circle
                cx={x} cy={y} r="18"
                fill={isActive ? "#3B82F6" : "#F8FAFC"}
                stroke={isActive ? "#2563EB" : "#94A3B8"}
                strokeWidth="2"
              />
              <SvgText
                x={x} y={y + 5}
                fontSize="8"
                fontWeight="bold"
                fill={isActive ? "white" : "#64748B"}
                textAnchor="middle"
              >
                {agent.name}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      
      {/* Pulse Effect for current agent */}
      {activeAgents.length > 0 && (
         <Animatable.Text 
            animation="pulse" 
            iterationCount="infinite" 
            style={styles.activeText}
         >
           Agent {activeAgents[activeAgents.length - 1]} is Live
         </Animatable.Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  activeText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: 'bold',
    marginTop: 5,
  }
});

export default WorkflowGraph;
