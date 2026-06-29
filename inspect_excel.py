import openpyxl

wb = openpyxl.load_workbook('docs/Bảng tính không có tiêu đề.xlsx')
sheet = wb['Nguyễn Đức Bảo - Performance Te']

for i in range(20, 50):
    row_values = []
    for j in range(1, 15):
        cell = sheet.cell(row=i, column=j)
        val = str(cell.value) if cell.value is not None else ""
        row_values.append(val.replace('\n', ' '))
    text = " | ".join(row_values)
    if text.replace(' | ', '').strip() != "":
        print(f"Row {i}:", text)
