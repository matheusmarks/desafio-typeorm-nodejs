import { getCustomRepository } from 'typeorm';
import TransactionRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

interface RequestDTO {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: RequestDTO): Promise<void> {
    const transactionRepository = getCustomRepository(TransactionRepository);

    const transaction = await transactionRepository.findOne({
      where: {
        id,
      },
    });

    if (!transaction) {
      throw new AppError('This transaction does not exist !');
    }

    await transactionRepository.delete(id);
  }
}

export default DeleteTransactionService;
