"""
Optional Python/OOP reference solver for FEC Circuit Lab.
GitHub Pages cannot run Python server-side; the published website uses the
equivalent JavaScript LinearSystemSolver in script.js.
"""
from dataclasses import dataclass
from typing import List


@dataclass
class LinearSystemResult:
    solution: List[float]
    max_residual: float


class LinearSystemSolver:
    """Solve a square linear system Ax = b using Gaussian elimination."""

    def __init__(self, matrix: List[List[float]], constants: List[float]):
        self.matrix = [list(map(float, row)) for row in matrix]
        self.constants = list(map(float, constants))
        self.size = len(self.matrix)

        if self.size == 0:
            raise ValueError("The system cannot be empty.")
        if any(len(row) != self.size for row in self.matrix):
            raise ValueError("The coefficient matrix must be square.")
        if len(self.constants) != self.size:
            raise ValueError("The constants vector must match the matrix size.")

    def solve(self) -> LinearSystemResult:
        a = [row[:] for row in self.matrix]
        b = self.constants[:]
        n = self.size
        tolerance = 1e-10

        for col in range(n):
            pivot_row = max(range(col, n), key=lambda row: abs(a[row][col]))
            if abs(a[pivot_row][col]) < tolerance:
                raise ValueError("The system has no unique solution (singular matrix).")

            if pivot_row != col:
                a[col], a[pivot_row] = a[pivot_row], a[col]
                b[col], b[pivot_row] = b[pivot_row], b[col]

            pivot = a[col][col]
            for j in range(col, n):
                a[col][j] /= pivot
            b[col] /= pivot

            for row in range(col + 1, n):
                factor = a[row][col]
                for j in range(col, n):
                    a[row][j] -= factor * a[col][j]
                b[row] -= factor * b[col]

        x = [0.0] * n
        for row in range(n - 1, -1, -1):
            x[row] = b[row] - sum(a[row][col] * x[col]
                                  for col in range(row + 1, n))

        residuals = [
            sum(self.matrix[row][col] * x[col] for col in range(n))
            - self.constants[row]
            for row in range(n)
        ]
        return LinearSystemResult(x, max(abs(value) for value in residuals))


if __name__ == "__main__":
    # Example: 3x + y - z = 4; x + 4y + z = 12; -x + y + 5z = 10
    example_matrix = [[3, 1, -1], [1, 4, 1], [-1, 1, 5]]
    example_constants = [4, 12, 10]
    result = LinearSystemSolver(example_matrix, example_constants).solve()
    print("Solution:", [round(value, 6) for value in result.solution])
    print("Maximum residual:", result.max_residual)
