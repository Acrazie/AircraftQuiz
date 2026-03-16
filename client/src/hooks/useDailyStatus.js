import { useEffect, useState } from "react";
import useAuthStore from "@/store/useAuthStore";
import { getDailyStatus } from "@/services/rankingService";

const useDailyStatus = () => {
  const { isAuthenticated } = useAuthStore();
  const [completedTypes, setCompletedTypes] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    setDailyLoading(true);
    setDailyError(false);
    getDailyStatus()
      .then((res) => setCompletedTypes(res.data.completedTypes ?? []))
      .catch(() => setDailyError(true))
      .finally(() => setDailyLoading(false));
  }, [isAuthenticated]);

  return { completedTypes, dailyLoading, dailyError };
};

export default useDailyStatus;
