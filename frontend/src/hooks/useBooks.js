import { useQuery } from "@tanstack/react-query";

import { bookKeys } from "../lib/queryKeys.js";
import { bookService } from "../services/bookService.js";

export const useBooks = () =>
  useQuery({
    queryKey: bookKeys.list(),
    queryFn: bookService.list,
  });

export const useBook = (isbn) =>
  useQuery({
    queryKey: bookKeys.detail(isbn),
    queryFn: () => bookService.getByIsbn(isbn),
  });
