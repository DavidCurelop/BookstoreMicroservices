import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { bookKeys, orderKeys } from "../lib/queryKeys.js";
import { orderService } from "../services/orderService.js";

export const useOrders = () =>
  useQuery({
    queryKey: orderKeys.list(),
    queryFn: orderService.list,
  });

export const useOrder = (orderId) =>
  useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => orderService.getById(orderId),
  });

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orderService.create,
    onSuccess: (order) => {
      // A purchase changes stock and the customer's order history.
      queryClient.invalidateQueries({ queryKey: bookKeys.all });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });

      // Resolved before navigating, so the success screen renders from cache.
      return queryClient.prefetchQuery({
        queryKey: orderKeys.detail(order.id),
        queryFn: () => orderService.getById(order.id),
      });
    },
  });
};
