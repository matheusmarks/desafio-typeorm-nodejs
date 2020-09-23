import csvParse from 'csv-parse';
import fs from 'fs';
import { getCustomRepository, getRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import TransactionRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface TransactionType {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(file: string): Promise<Transaction[]> {
    const readStream = fs.createReadStream(file);

    const parseStream = csvParse({
      from_line: 2,
    });

    const parseCSV = readStream.pipe(parseStream);

    const transactionItems: TransactionType[] = [];
    const categoryItems: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      transactionItems.push({
        title,
        type,
        value,
        category,
      });

      categoryItems.push(category);
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const transactionRepository = getCustomRepository(TransactionRepository);
    const categoryRepository = getRepository(Category);

    // verifica quais categories do arq existem no BD
    const existentCategories = await categoryRepository.find({
      where: {
        title: In(categoryItems),
      },
    });

    // pega o nome(title) de cada category encontrada no bd
    const foundCategories = existentCategories.map((category: Category) => {
      return category.title;
    });

    // se houver duplicatas retorna só uma delas
    const addCategory = categoryItems
      .filter(category => !foundCategories.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategory = categoryRepository.create(
      addCategory.map(title => ({
        title,
      })),
    );

    await categoryRepository.save(newCategory);

    const finalCategories = [...newCategory, ...existentCategories];

    const transactions = transactionRepository.create(
      transactionItems.map(transaction => ({
        title: transaction.title,
        value: transaction.value,
        type: transaction.type,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionRepository.save(transactions);

    return transactions;
  }
}

export default ImportTransactionsService;
