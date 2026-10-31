import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlanningBriefRepository } from '../utils/planningBriefs';

export const planningBriefs = new PlanningBriefRepository(AsyncStorage);
